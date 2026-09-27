/**
 * THE GAP, as a physical ticket between LOOK and ACT (Lab + Challenge).
 *
 *  - gap width   = time in which the world could change (never divergence on its own)
 *  - world sticker dropped into the tear = WHEN the world changes (a logical tick)
 *  - playhead    = the agent travelling toward ACT
 *
 * Input: pointer drag, tap-to-arm then tap-to-drop, and keyboard (arrows / Enter / Escape).
 * The ticket only reports logical ticks; it never decides outcomes.
 */
import { MAX_GAP, MIN_GAP, PREPARE_TICK, actTick } from "../scenarios/types";

export type TicketOptions = {
  mode: "lab" | "challenge";
  mutationLabel: string;
  gap: number;
  onGap?: (gap: number) => void;
  onMutation?: (tick: number | null) => void;
};

export class Ticket {
  readonly el: HTMLElement;
  gap: number;
  mutationTick: number | null = null;
  private armed: number | null = null;
  private strip: HTMLElement;
  private sticker: HTMLButtonElement;
  private marker: HTMLElement;
  private head: HTMLElement;
  private locked = false;

  constructor(private opts: TicketOptions) {
    this.gap = opts.gap;
    const el = document.createElement("div");
    el.className = `ticket ticket--${opts.mode}`;
    el.innerHTML = `
      <div class="ticket__row">
        <span class="ticket__stub ticket__stub--look"><i></i><b>LOOK</b></span>
        <div class="ticket__strip" role="slider" tabindex="0" aria-label="The gap between looking and acting" aria-valuemin="${MIN_GAP}" aria-valuemax="${MAX_GAP}">
          <span class="ticket__ticks"></span>
          <span class="ticket__marker" hidden><span>${opts.mutationLabel}</span></span>
          <span class="ticket__armed" hidden></span>
          <span class="ticket__head"></span>
        </div>
        <button class="ticket__stub ticket__stub--act" type="button" aria-label="ACT end of the gap${opts.mode === "lab" ? " — drag right to widen the gap" : ""}"><i></i><b>ACT</b></button>
      </div>
      <div class="ticket__tray">
        <button class="sticker" type="button" aria-describedby="sticker-help-${opts.mode}"><span aria-hidden="true">⋮⋮</span> ${opts.mutationLabel}</button>
        <span class="sr-only" id="sticker-help-${opts.mode}">Drag into the gap, or press Enter to pick up, arrow keys to choose when, Enter to drop.</span>
      </div>`;
    this.el = el;
    this.strip = el.querySelector(".ticket__strip")!;
    this.sticker = el.querySelector(".sticker")!;
    this.marker = el.querySelector(".ticket__marker")!;
    this.head = el.querySelector(".ticket__head")!;
    this.wire();
    this.render();
  }

  get act(): number {
    return actTick(this.gap);
  }

  lock(on: boolean): void {
    this.locked = on;
    this.el.dataset.locked = String(on);
    this.sticker.disabled = on || this.mutationTick !== null;
  }

  setGap(n: number): void {
    if (this.locked || this.opts.mode !== "lab") return;
    const g = Math.max(MIN_GAP, Math.min(MAX_GAP, Math.round(n)));
    if (g === this.gap) return;
    this.gap = g;
    if (this.mutationTick !== null && this.mutationTick >= this.act) this.setMutation(this.act - 1);
    this.opts.onGap?.(g);
    this.render();
  }

  /** Lab: only strictly inside (prepare, act). Challenge passes its own tick (may be late). */
  setMutation(tick: number | null): void {
    this.mutationTick = tick === null ? null : this.opts.mode === "lab" ? this.clampInside(tick) : tick;
    this.armed = null;
    this.opts.onMutation?.(this.mutationTick);
    this.render();
  }

  /** 0..1 along LOOK→ACT for the travelling agent (challenge / release). */
  setHead(fraction: number | null): void {
    this.el.dataset.travel = String(fraction !== null);
    if (fraction !== null) this.head.style.setProperty("--p", String(Math.max(0, Math.min(1, fraction))));
  }

  private clampInside(t: number): number {
    return Math.max(PREPARE_TICK + 1, Math.min(this.act - 1, Math.round(t)));
  }

  private tickAt(clientX: number): number {
    const r = this.strip.getBoundingClientRect();
    return this.clampInside(((clientX - r.left) / r.width) * this.act);
  }

  private render(): void {
    const act = this.act;
    this.el.style.setProperty("--gap", String(this.gap));
    this.strip.setAttribute("aria-valuenow", String(this.gap));
    this.strip.setAttribute("aria-valuetext", `gap of ${this.gap} ticks; the agent acts at t${act}${this.mutationTick !== null ? `; the world changes at t${this.mutationTick}` : ""}`);
    const ticks = this.el.querySelector(".ticket__ticks")!;
    ticks.innerHTML = Array.from({ length: act - 1 }, (_, i) => `<i style="left:${((i + 1) / act) * 100}%"${i + 1 === PREPARE_TICK ? ' class="prep"' : ""}></i>`).join("");
    const pct = (t: number) => `${(t / act) * 100}%`;
    this.marker.hidden = this.mutationTick === null;
    if (this.mutationTick !== null) this.marker.style.setProperty("--x", pct(Math.min(this.mutationTick, act)));
    this.marker.dataset.late = String(this.mutationTick !== null && this.mutationTick >= act);
    const armedEl = this.el.querySelector<HTMLElement>(".ticket__armed")!;
    armedEl.hidden = this.armed === null;
    if (this.armed !== null) armedEl.style.setProperty("--x", pct(this.armed));
    this.el.dataset.placed = String(this.mutationTick !== null);
    this.el.dataset.armed = String(this.armed !== null);
    this.sticker.disabled = this.locked || this.mutationTick !== null;
  }

  private wire(): void {
    // Gap: drag the ACT stub (lab only).
    const act = this.el.querySelector<HTMLButtonElement>(".ticket__stub--act")!;
    act.addEventListener("pointerdown", (ev) => {
      if (this.opts.mode !== "lab" || this.locked) return;
      ev.preventDefault();
      act.setPointerCapture(ev.pointerId);
      const x0 = ev.clientX;
      const g0 = this.gap;
      const per = this.strip.getBoundingClientRect().width / this.act;
      this.el.dataset.dragging = "true";
      const move = (e: PointerEvent) => this.setGap(g0 + (e.clientX - x0) / Math.max(per, 6));
      const up = () => {
        this.el.dataset.dragging = "false";
        act.removeEventListener("pointermove", move);
        act.removeEventListener("pointerup", up);
        act.removeEventListener("pointercancel", up);
      };
      act.addEventListener("pointermove", move);
      act.addEventListener("pointerup", up);
      act.addEventListener("pointercancel", up);
    });
    // Keyboard on the strip: arrows = gap (or armed position); Enter = drop armed.
    this.strip.addEventListener("keydown", (e) => {
      if (this.locked) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const d = e.key === "ArrowRight" ? 1 : -1;
        if (this.armed !== null) {
          this.armed = this.clampInside(this.armed + d);
          this.render();
        } else this.setGap(this.gap + d * (e.shiftKey ? 4 : 1));
      } else if (e.key === "Enter" && this.armed !== null) {
        e.preventDefault();
        this.setMutation(this.armed);
      }
    });
    // Tap inside the strip while armed = drop there.
    this.strip.addEventListener("pointerdown", (e) => {
      if (this.armed !== null && !this.locked) this.setMutation(this.tickAt(e.clientX));
    });
    // Sticker: drag into the strip, or tap / Enter to arm.
    this.sticker.addEventListener("pointerdown", (ev) => {
      if (this.sticker.disabled || this.opts.mode !== "lab") return;
      ev.preventDefault();
      const sx = ev.clientX;
      const sy = ev.clientY;
      let ghost: HTMLElement | null = null;
      const move = (e: PointerEvent) => {
        if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
        if (!ghost) {
          ghost = this.sticker.cloneNode(true) as HTMLElement;
          ghost.classList.add("sticker--drag");
          document.body.appendChild(ghost);
        }
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
        const inside = this.inside(e.clientX, e.clientY);
        this.armed = inside ? this.tickAt(e.clientX) : null;
        this.render();
      };
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (ghost) {
          ghost.remove();
          if (this.inside(e.clientX, e.clientY)) this.setMutation(this.tickAt(e.clientX));
          else {
            this.armed = null;
            this.render();
          }
        } else this.toggleArm();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
    this.sticker.addEventListener("click", (e) => {
      if (e.detail === 0) this.toggleArm(true); // keyboard activation
    });
    this.sticker.addEventListener("keydown", (e) => {
      if (this.armed === null) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        this.armed = this.clampInside(this.armed + (e.key === "ArrowRight" ? 1 : -1));
        this.render();
      } else if (e.key === "Escape") {
        this.armed = null;
        this.render();
      }
    });
  }

  private toggleArm(keyboard = false): void {
    if (this.locked || this.mutationTick !== null) return;
    if (this.armed !== null) {
      if (keyboard) this.setMutation(this.armed);
      else {
        this.armed = null;
        this.render();
      }
      return;
    }
    this.armed = this.clampInside(PREPARE_TICK + Math.ceil(this.gap / 2));
    this.render();
  }

  private inside(x: number, y: number): boolean {
    const r = this.strip.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top - 56 && y <= r.bottom + 56;
  }
}
