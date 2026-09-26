/**
 * Hero controller: the bridge between gestures and the kernel.
 *
 * - Owns no world logic. Every state change goes through simulation/src applyEvent.
 * - Owns no DOM. The renderer subscribes and draws from `snapshot()`.
 * - Gesture geometry is converted to logical ticks here; the kernel never sees pixels or time.
 */
import {
  DEFAULT_GAP_TICKS,
  MAX_GAP_TICKS,
  PREPARE_TICK,
  agentCommit,
  agentOpening,
  applyEvent,
  belief,
  buildReceipt,
  commitTickFor,
  createWorld,
  isMisregistered,
  outcomeOf,
  reduce,
  type CommitPolicy,
  type DeterministicReceipt,
  type Outcome,
  type WorldEvent,
  type WorldEventInput,
  type WorldState,
} from "../simulation/src";

export const MIN_GAP_TICKS = 2;
/** The event tray becomes actionable once the gap is at least this wide. */
export const OPEN_THRESHOLD_TICKS = 4;

export type Phase =
  | "CLOSED" // default: perfectly registered, gap at minimum
  | "OPEN" // gap pulled open, world may change
  | "ARMED" // event token picked up (keyboard / tap path), placing inside the gap
  | "INSERTED" // world changed inside the gap
  | "COMMITTING" // released: agent closing moves are being applied step by step
  | "RESOLVED";

export type HeroSnapshot = {
  seed: string;
  phase: Phase;
  policy: CommitPolicy;
  gapTicks: number;
  commitTick: number;
  armedTick: number | null;
  revokeTick: number | null;
  world: WorldState;
  beliefVersion: number | null;
  beliefAccess: WorldState["accessState"] | null;
  misregistered: boolean;
  outcome: Outcome;
  lastEvent: WorldEvent | null;
};

type Listener = (s: HeroSnapshot) => void;

export class HeroController {
  readonly seed: string;
  private initial: WorldState;
  private world: WorldState;
  private phase: Phase = "CLOSED";
  private policy: CommitPolicy = "UNGUARDED";
  private gapTicks = MIN_GAP_TICKS;
  private armedTick: number | null = null;
  private revokeTick: number | null = null;
  private pendingSteps: WorldEventInput[] = [];
  private listeners = new Set<Listener>();

  constructor(seed: string) {
    this.seed = seed;
    this.initial = createWorld(seed);
    this.world = reduce(this.initial, agentOpening(seed));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): HeroSnapshot {
    const b = belief(this.world);
    return {
      seed: this.seed,
      phase: this.phase,
      policy: this.policy,
      gapTicks: this.gapTicks,
      commitTick: commitTickFor(this.gapTicks),
      armedTick: this.armedTick,
      revokeTick: this.revokeTick,
      world: this.world,
      beliefVersion: b?.witnessedWorldVersion ?? null,
      beliefAccess: b?.accessState ?? null,
      misregistered: isMisregistered(this.world),
      outcome: outcomeOf(this.world),
      lastEvent: this.world.eventLog.at(-1) ?? null,
    };
  }

  // ---------- gap ----------

  canResize(): boolean {
    return this.phase === "CLOSED" || this.phase === "OPEN";
  }

  setGapTicks(n: number): void {
    if (!this.canResize()) return;
    const t = clamp(Math.round(n), MIN_GAP_TICKS, MAX_GAP_TICKS);
    if (t === this.gapTicks) return;
    this.gapTicks = t;
    this.phase = t >= OPEN_THRESHOLD_TICKS ? "OPEN" : "CLOSED";
    this.emit();
  }

  canInsert(): boolean {
    return (this.phase === "OPEN" || this.phase === "ARMED") && this.gapTicks >= OPEN_THRESHOLD_TICKS;
  }

  /** Valid insertion ticks lie strictly inside (PREPARE_TICK, commitTick). */
  clampInsertTick(t: number): number {
    return clamp(Math.round(t), PREPARE_TICK + 1, commitTickFor(this.gapTicks) - 1);
  }

  /** Map a 0..1 position along the drawn OBSERVE(t0)→ACT(commitTick) interval to a logical tick. */
  tickAtFraction(f: number): number {
    return this.clampInsertTick(f * commitTickFor(this.gapTicks));
  }

  // ---------- event token (keyboard / tap path) ----------

  arm(): void {
    if (!this.canInsert()) return;
    this.phase = "ARMED";
    this.armedTick = this.clampInsertTick(PREPARE_TICK + this.gapTicks / 2);
    this.emit();
  }

  moveArmed(delta: number): void {
    if (this.phase !== "ARMED" || this.armedTick === null) return;
    this.armedTick = this.clampInsertTick(this.armedTick + delta);
    this.emit();
  }

  disarm(): void {
    if (this.phase !== "ARMED") return;
    this.phase = "OPEN";
    this.armedTick = null;
    this.emit();
  }

  /** INSERT: the visitor (the world) revokes access at a deterministic position in the gap. */
  insertAt(tick: number): void {
    if (!this.canInsert()) return;
    const t = this.clampInsertTick(tick);
    this.world = applyEvent(this.world, { type: "ADMIN_REVOKES_ACCESS", tick: t });
    this.revokeTick = t;
    this.armedTick = null;
    this.phase = "INSERTED";
    this.emit();
  }

  // ---------- policy ----------

  setPolicy(p: CommitPolicy): void {
    if (this.phase === "COMMITTING" || this.phase === "RESOLVED") return;
    this.policy = p;
    this.emit();
  }

  // ---------- release / commit ----------

  canRelease(): boolean {
    return this.phase === "CLOSED" || this.phase === "OPEN" || this.phase === "INSERTED";
  }

  /**
   * RELEASE: computes the agent's closing moves from current state (via the kernel's
   * deterministic agent) and queues them. The renderer pulls them one at a time with
   * `step()` so animation timing never enters the kernel.
   */
  release(): number {
    if (!this.canRelease()) return 0;
    const { emitted } = agentCommit(this.world, this.policy, commitTickFor(this.gapTicks));
    this.pendingSteps = emitted;
    this.phase = "COMMITTING";
    this.emit();
    return emitted.length;
  }

  /** Applies the next queued closing move. Returns the logged event, or null when done. */
  step(): WorldEvent | null {
    const next = this.pendingSteps.shift();
    if (!next) return null;
    this.world = applyEvent(this.world, next);
    if (this.pendingSteps.length === 0) this.phase = "RESOLVED";
    this.emit();
    return this.world.eventLog.at(-1) ?? null;
  }

  // ---------- replay / reset ----------

  /** Same seed, same world events, same gap — optionally a different commit policy. */
  replay(policy: CommitPolicy = this.policy): void {
    const gap = this.gapTicks;
    const revokeTick = this.revokeTick;
    this.reset();
    this.policy = policy;
    this.gapTicks = gap;
    this.phase = gap >= OPEN_THRESHOLD_TICKS ? "OPEN" : "CLOSED";
    if (revokeTick !== null) {
      this.world = applyEvent(this.world, { type: "ADMIN_REVOKES_ACCESS", tick: revokeTick });
      this.revokeTick = revokeTick;
      this.phase = "INSERTED";
    }
    this.emit();
  }

  reset(): void {
    this.world = reduce(this.initial, agentOpening(this.seed));
    this.phase = "CLOSED";
    this.gapTicks = MIN_GAP_TICKS;
    this.armedTick = null;
    this.revokeTick = null;
    this.pendingSteps = [];
    this.emit();
  }

  receipt(): DeterministicReceipt {
    return buildReceipt(this.initial, this.world, this.policy);
  }

  private emit(): void {
    const s = this.snapshot();
    for (const fn of this.listeners) fn(s);
  }
}

export { DEFAULT_GAP_TICKS, MAX_GAP_TICKS, PREPARE_TICK };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
