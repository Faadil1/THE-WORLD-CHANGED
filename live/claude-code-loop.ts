/**
 * Claude Code / Agent SDK agent loop. Pure: no package or node imports, so it sits inside the
 * audited model path. The network-capable part (the SDK subprocess) is behind `ClaudeCodeDriver`
 * (live/claude-code-transport.ts), exactly like `ModelTransport` for the direct API route.
 *
 * World access: the four MCP handlers built here are the ONLY way the model reaches the world,
 * and each one calls SandboxSession.call -> kernel applyEvent. There is no second simulation.
 *
 * Canonical timing: ADMIN_REVOKES_ACCESS is applied inside the handler of the first successful
 * prepare_export, before its result is returned, so no later model action can precede it.
 *
 * Evidence: init block (session id, model, tools), assistant ids/models/stop reasons, visible
 * text, tool_use ids/names, sandbox results, result subtype, permission denials. Thinking and
 * redacted-thinking blocks are counted only; their content is never read into the result.
 */
import {
  INJECTION_POLICY,
  LIVE_MODEL_ID,
  redact,
  taskPrompt,
  type AssistantTurn,
  type ClaudeCodeEvidence,
  type LoopResult,
  type ObservableToolCall,
  type ObservableToolResult,
} from "./agent-loop";
import { SANDBOX_TOOL_NAMES, SandboxSession, type SandboxToolName } from "./tools";

export const TWC_MCP_SERVER_NAME = "twc";
export const TWC_MCP_PREFIX = `mcp__${TWC_MCP_SERVER_NAME}__`;
/** The exact tool set a genuine claude-code-sdk init block must report. */
export const TWC_MCP_TOOL_NAMES = Object.freeze(SANDBOX_TOOL_NAMES.map((n) => `${TWC_MCP_PREFIX}${n}`)) as readonly string[];

export type TwcHandlerResult = { text: string; isError: boolean };
export type TwcHandlers = Readonly<Record<SandboxToolName, (args: unknown) => Promise<TwcHandlerResult>>>;

export type PreflightInfo = NonNullable<ClaudeCodeEvidence["preflight"]>;

/** Minimal structural view of an SDK stream message. */
export type SdkMessageLike = { type: string; subtype?: string; [k: string]: unknown };

export interface ClaudeCodeDriver {
  readonly kind: "claude-code-sdk" | "test-double";
  /**
   * Start one query. The driver must call `preflight` BEFORE releasing the prompt; if it returns
   * failures the driver must throw `PreflightError` without sending the task to the model.
   */
  start(args: {
    model: string;
    prompt: string;
    handlers: TwcHandlers;
    preflight: (info: PreflightInfo) => string[];
  }): { messages: AsyncIterable<SdkMessageLike>; abort(): void };
}

export class PreflightError extends Error {
  constructor(readonly failures: string[]) {
    super(`claude-code preflight failed: ${failures.join("; ")}`);
    this.name = "PreflightError";
  }
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));

/** Pre-prompt gate: exactly one connected in-process `twc` server with exactly the four tools; no agents. */
export function preflightFailures(info: PreflightInfo): string[] {
  const f: string[] = [];
  if (info.mcp_servers.length !== 1) f.push(`expected exactly 1 MCP server, got ${info.mcp_servers.map((s) => s.name).join(",") || "none"}`);
  const twc = info.mcp_servers.find((s) => s.name === TWC_MCP_SERVER_NAME);
  if (!twc) f.push("twc MCP server missing");
  else {
    if (twc.status !== "connected") f.push(`twc status ${twc.status}`);
    if (twc.source !== null && twc.source !== "sdk") f.push(`twc source ${twc.source}`);
    if (!sameSet(twc.tools, SANDBOX_TOOL_NAMES)) f.push(`twc tools ${JSON.stringify(twc.tools)}`);
  }
  if (info.agents.length > 0) f.push(`agents available: ${info.agents.join(",")}`);
  return f;
}

/** Init gate: the SDK init tool list must equal exactly the four mcp__twc__ tools. */
export function initToolSetExact(tools: readonly string[]): boolean {
  return sameSet(tools, TWC_MCP_TOOL_NAMES);
}

const REASONING_TYPES = new Set(["thinking", "redacted_thinking"]);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : str((x as { name?: unknown })?.name))) : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

type Invocation = { name: SandboxToolName; text: string; traceIndex: number; matched: boolean };

export async function runClaudeCodeLoop(driver: ClaudeCodeDriver, session: SandboxSession, model = LIVE_MODEL_ID): Promise<LoopResult> {
  const prompt = taskPrompt(session.expectedRecordCount);
  const evidence: ClaudeCodeEvidence = {
    preflight: null,
    init: null,
    init_tool_set_exact: false,
    tool_uses: [],
    non_twc_tool_attempts: [],
    permission_denials: [],
    result: null,
    message_counts: {},
  };
  const out: LoopResult = {
    transport: driver.kind,
    model_requested: model,
    task_prompt: prompt,
    turns: [],
    tool_calls: [],
    tool_results: [],
    injected_at_tick: null,
    injected_after_tool_index: null,
    terminated_by: "RUN_ERROR",
    final_stop_reason: null,
    run_error: null,
    session,
    claude_code: evidence,
  };

  // ---- the four MCP handlers: sandbox only ----
  const invocations: Invocation[] = [];
  const versionBefore = new Map<number, number>();
  const handlers = Object.freeze(
    Object.fromEntries(
      SANDBOX_TOOL_NAMES.map((name) => [
        name,
        async (args: unknown): Promise<TwcHandlerResult> => {
          const before = session.state.worldVersion;
          const outcome = session.call(name, args);
          const trace = session.toolTrace.at(-1)!;
          versionBefore.set(trace.index, before);
          const text = JSON.stringify(outcome.ok ? outcome.result : { error: outcome.error });
          invocations.push({ name, text, traceIndex: trace.index, matched: false });
          // THE WORLD CHANGES: once, immediately after the first successful prepared action,
          // before this result is returned — so before any later model action.
          if (out.injected_at_tick === null && name === "prepare_export" && outcome.ok) {
            const ev = session.injectWorldEvent(INJECTION_POLICY.event);
            out.injected_at_tick = ev.tick;
            out.injected_after_tool_index = trace.index;
          }
          return { text, isError: !outcome.ok };
        },
      ]),
    ) as Record<SandboxToolName, (args: unknown) => Promise<TwcHandlerResult>>,
  );

  // ---- stream bookkeeping ----
  const turnById = new Map<string, AssistantTurn>();
  const toolUseTurn = new Map<string, number>();
  const toolResultText = new Map<string, string>();
  let sawResult = false;

  const started = driver.start({
    model,
    prompt,
    handlers,
    preflight: (info) => {
      evidence.preflight = info;
      return preflightFailures(info);
    },
  });

  try {
    for await (const m of started.messages) {
      const key = m.subtype ? `${m.type}:${m.subtype}` : m.type;
      evidence.message_counts[key] = (evidence.message_counts[key] ?? 0) + 1;

      if (m.type === "system" && m.subtype === "init") {
        const tools = strArr(m.tools);
        evidence.init = {
          session_id: str(m.session_id),
          model: str(m.model),
          tools,
          mcp_servers: (Array.isArray(m.mcp_servers) ? m.mcp_servers : []).map((s: { name?: unknown; status?: unknown; source?: unknown }) => ({
            name: str(s?.name),
            status: str(s?.status),
            source: typeof s?.source === "string" ? s.source : null,
          })),
          agents: strArr(m.agents),
          skills: strArr(m.skills),
          plugins: strArr(m.plugins),
          slash_command_count: Array.isArray(m.slash_commands) ? m.slash_commands.length : 0,
          permission_mode: str(m.permissionMode),
          api_key_source: str(m.apiKeySource),
          claude_code_version: str(m.claude_code_version),
        };
        evidence.init_tool_set_exact = initToolSetExact(tools);
        if (!evidence.init_tool_set_exact) {
          // Any extra (or missing) tool invalidates the run: stop immediately.
          out.terminated_by = "INIT_TOOLSET_INVALID";
          out.run_error = `init tool set is not exactly the four twc tools: ${JSON.stringify(tools)}`;
          started.abort();
          break;
        }
        continue;
      }

      if (m.type === "assistant" && m.parent_tool_use_id == null) {
        const msg = (m.message ?? {}) as { id?: unknown; model?: unknown; stop_reason?: unknown; content?: unknown; usage?: { input_tokens?: unknown; output_tokens?: unknown } };
        const id = str(msg.id) || `anon-${turnById.size}`;
        let turn = turnById.get(id);
        if (!turn) {
          turn = {
            turn: turnById.size,
            response_id: id,
            model_reported: str(msg.model),
            stop_reason: null,
            visible_text: [],
            tool_use_ids: [],
            reasoning_blocks_omitted: 0,
            usage: { input_tokens: null, output_tokens: null },
          };
          turnById.set(id, turn);
          out.turns.push(turn);
        }
        if (typeof msg.stop_reason === "string") turn.stop_reason = msg.stop_reason;
        if (msg.usage) turn.usage = { input_tokens: num(msg.usage.input_tokens), output_tokens: num(msg.usage.output_tokens) };
        for (const b of Array.isArray(msg.content) ? (msg.content as Array<Record<string, unknown>>) : []) {
          const type = str(b?.type);
          if (REASONING_TYPES.has(type)) turn.reasoning_blocks_omitted++;
          else if (type === "text") turn.visible_text.push(str(b.text));
          else if (type === "tool_use") {
            const tid = str(b.id);
            const name = str(b.name).slice(0, 128);
            turn.tool_use_ids.push(tid);
            toolUseTurn.set(tid, turn.turn);
            evidence.tool_uses.push({ tool_use_id: tid, name, routed_to_sandbox: false });
            if (!TWC_MCP_TOOL_NAMES.includes(name)) evidence.non_twc_tool_attempts.push({ tool_use_id: tid, name });
          }
        }
        continue;
      }

      if (m.type === "user") {
        const content = (m.message as { content?: unknown } | undefined)?.content;
        for (const b of Array.isArray(content) ? (content as Array<Record<string, unknown>>) : []) {
          if (b?.type !== "tool_result") continue;
          const c = b.content;
          const text = typeof c === "string" ? c : Array.isArray(c) ? c.map((x: { text?: unknown }) => str(x?.text)).join("") : "";
          toolResultText.set(str(b.tool_use_id), text);
        }
        continue;
      }

      if (m.type === "result") {
        sawResult = true;
        const subtype = str(m.subtype);
        evidence.result = {
          subtype,
          is_error: m.is_error === true,
          num_turns: num(m.num_turns),
          stop_reason: typeof m.stop_reason === "string" ? m.stop_reason : null,
          duration_ms: num(m.duration_ms),
          total_cost_usd: num(m.total_cost_usd),
          errors: Array.isArray(m.errors) ? m.errors.map((e) => redact(String(e))) : [],
        };
        evidence.permission_denials = (Array.isArray(m.permission_denials) ? m.permission_denials : []).map((d: { tool_use_id?: unknown; tool_name?: unknown }) => ({
          tool_use_id: str(d?.tool_use_id),
          tool_name: str(d?.tool_name).slice(0, 128),
        }));
        out.final_stop_reason = evidence.result.stop_reason;
        if (subtype === "success" && !evidence.result.is_error) out.terminated_by = out.final_stop_reason === "end_turn" || out.final_stop_reason === null ? "END_TURN" : "STOP_REASON";
        else if (subtype === "error_max_turns") out.terminated_by = "MAX_TURNS";
        else {
          out.terminated_by = "RUN_ERROR";
          out.run_error = redact(`result ${subtype}${evidence.result.errors.length ? `: ${evidence.result.errors.join("; ")}` : ""}`);
        }
        break;
      }
    }
    if (!sawResult && out.terminated_by !== "INIT_TOOLSET_INVALID") {
      out.terminated_by = "RUN_ERROR";
      out.run_error = out.run_error ?? "SDK stream ended without a result message";
    }
  } catch (e) {
    if (e instanceof PreflightError) throw e; // no model call happened; the runner stops
    out.terminated_by = out.terminated_by === "INIT_TOOLSET_INVALID" ? out.terminated_by : "RUN_ERROR";
    out.run_error = out.run_error ?? redact(String((e as Error)?.message ?? e));
  } finally {
    started.abort();
  }
  if (out.final_stop_reason === null) out.final_stop_reason = out.turns.at(-1)?.stop_reason ?? null;

  // ---- correlate sandbox invocations with tool_use ids (stream order, same name, same result text) ----
  for (const tu of evidence.tool_uses) {
    if (!tu.name.startsWith(TWC_MCP_PREFIX)) continue;
    const bare = tu.name.slice(TWC_MCP_PREFIX.length);
    const text = toolResultText.get(tu.tool_use_id);
    const inv = invocations.find((i) => !i.matched && i.name === bare && (text === undefined || i.text === text));
    if (!inv) continue;
    inv.matched = true;
    tu.routed_to_sandbox = true;
    (inv as Invocation & { toolUseId?: string }).toolUseId = tu.tool_use_id;
  }

  for (const inv of invocations as Array<Invocation & { toolUseId?: string }>) {
    const trace = session.toolTrace[inv.traceIndex]!;
    const tid = inv.toolUseId ?? `unmatched-${trace.index}`;
    const call: ObservableToolCall = {
      index: trace.index,
      turn: inv.toolUseId !== undefined ? (toolUseTurn.get(inv.toolUseId) ?? -1) : -1,
      tool_use_id: tid,
      name: trace.name,
      arguments: trace.arguments,
      tick: trace.tick,
    };
    const result: ObservableToolResult = {
      index: trace.index,
      tool_use_id: tid,
      name: trace.name,
      ok: trace.outcome.ok,
      result: trace.outcome.ok ? trace.outcome.result : null,
      error: trace.outcome.ok ? null : trace.outcome.error,
      world_version_before: versionBefore.get(trace.index) ?? trace.world_version_before,
      world_version_after: trace.world_version_after,
    };
    out.tool_calls.push(call);
    out.tool_results.push(result);
  }
  return out;
}
