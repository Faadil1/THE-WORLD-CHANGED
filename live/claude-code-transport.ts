/**
 * Claude Code / Claude Agent SDK transport. Used ONLY by the default live runner.
 * Not reachable from tool or model-path code (the import graph is audited).
 *
 * Authentication belongs to Claude Code: this module never reads, prints or passes credentials,
 * and it removes ANTHROPIC_API_KEY from the subprocess environment (the runner also refuses to
 * start when it is present). The environment is received as an argument, never read here.
 *
 * Tool surface: exactly one in-process MCP server `twc` exposing the four sandbox tools, whose
 * handlers are supplied by live/claude-code-loop.ts and route only to SandboxSession.
 * Built-in tools are disabled (`tools: []`), no other MCP config is loaded (`strictMcpConfig`),
 * no filesystem settings/skills are loaded, nothing is persisted, and anything not pre-approved
 * is denied (`permissionMode: "dontAsk"`).
 */
import { createSdkMcpServer, query, type McpSdkServerConfigWithInstance, type Options, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { LIVE_MAX_TURNS, LIVE_MODEL_ID } from "./agent-loop";
import { PreflightError, TWC_MCP_SERVER_NAME, TWC_MCP_TOOL_NAMES, type ClaudeCodeDriver, type SdkMessageLike, type TwcHandlers } from "./claude-code-loop";
import { MAX_RECORD_COUNT, MAX_WITNESS_VERSION, SANDBOX_TOOL_DEFINITIONS, type SandboxToolName } from "./tools";

/** Subprocess environment flags required by product/CLAUDE-CODE-LIVE-TRANSPORT.md. */
export const CLAUDE_CODE_ENV_FLAGS = Object.freeze({
  ENABLE_CLAUDEAI_MCP_SERVERS: "false",
  CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS: "1",
  CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1",
});

/** Hard wall-clock bound for one run. */
export const CLAUDE_CODE_RUN_TIMEOUT_MS = 15 * 60_000;

/** Inherited environment + the three flags, with ANTHROPIC_API_KEY removed. */
export function subprocessEnv(parent: Readonly<Record<string, string | undefined>>): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...parent, ...CLAUDE_CODE_ENV_FLAGS };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

/**
 * Strict zod schemas mirroring SANDBOX_TOOL_DEFINITIONS input_schema (parity is tested).
 * The MCP layer rejects malformed arguments; the kernel adapter re-validates anyway.
 */
export const TWC_INPUT_SCHEMAS = Object.freeze({
  observe_access: z.strictObject({}),
  prepare_export: z.strictObject({
    record_count: z.number().int().min(1).max(MAX_RECORD_COUNT).describe("Number of records to export."),
  }),
  verify_access: z.strictObject({}),
  commit_export: z.strictObject({
    witness_version: z.number().int().min(0).max(MAX_WITNESS_VERSION).describe("world_version of the access observation used as authority."),
  }),
}) satisfies Record<SandboxToolName, z.ZodObject>;

/** The one in-process MCP server. Handlers come from the loop and touch only the sandbox. */
export function buildTwcServer(handlers: TwcHandlers): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({
    name: TWC_MCP_SERVER_NAME,
    version: "0.1.0",
    alwaysLoad: true, // never deferred behind a tool-search tool
    tools: SANDBOX_TOOL_DEFINITIONS.map((d) => ({
      name: d.name,
      description: d.description,
      // A zod object (not a raw shape) keeps the schema strict: no extra keys.
      inputSchema: TWC_INPUT_SCHEMAS[d.name] as never,
      handler: async (args: unknown) => {
        const r = await handlers[d.name](args);
        return { content: [{ type: "text" as const, text: r.text }], ...(r.isError ? { isError: true } : {}) };
      },
    })),
  });
}

/** The exact query options. Kept in one function so tests can assert every field. */
export function buildQueryOptions(
  server: McpSdkServerConfigWithInstance,
  extras: { env: Record<string, string | undefined>; cwd: string; abortController: AbortController },
): Options {
  return {
    model: LIVE_MODEL_ID,
    tools: [],
    mcpServers: { [TWC_MCP_SERVER_NAME]: server },
    strictMcpConfig: true,
    allowedTools: [...TWC_MCP_TOOL_NAMES],
    permissionMode: "dontAsk",
    settingSources: [],
    skills: [],
    persistSession: false,
    maxTurns: LIVE_MAX_TURNS,
    env: extras.env,
    cwd: extras.cwd,
    abortController: extras.abortController,
  };
}

/** Receipt-safe description of the query configuration (no env values, no paths). */
export function describeQueryConfig(): Record<string, unknown> {
  return {
    model: LIVE_MODEL_ID,
    tools: [],
    mcpServers: [TWC_MCP_SERVER_NAME],
    strictMcpConfig: true,
    allowedTools: [...TWC_MCP_TOOL_NAMES],
    permissionMode: "dontAsk",
    settingSources: [],
    skills: [],
    persistSession: false,
    maxTurns: LIVE_MAX_TURNS,
    systemPrompt: "not set (Claude Agent SDK default)",
    cwd: "fresh empty temporary directory",
    env_flags: { ...CLAUDE_CODE_ENV_FLAGS },
    anthropic_api_key_passed: false,
  };
}

/** Real driver: spawns Claude Code through the Agent SDK V1 `query()` API. */
export function claudeCodeDriver(parentEnv: Readonly<Record<string, string | undefined>>): ClaudeCodeDriver {
  return {
    kind: "claude-code-sdk",
    start({ model, prompt, handlers, preflight }) {
      if (model !== LIVE_MODEL_ID) throw new Error(`refused: model must be ${LIVE_MODEL_ID}`);
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(), CLAUDE_CODE_RUN_TIMEOUT_MS);
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      // Streaming input: the task is held back until the pre-prompt gate passes.
      async function* input(): AsyncGenerator<SDKUserMessage> {
        await gate;
        if (abortController.signal.aborted) return;
        yield { type: "user", message: { role: "user", content: prompt }, parent_tool_use_id: null } as SDKUserMessage;
      }
      const q = query({
        prompt: input(),
        options: buildQueryOptions(buildTwcServer(handlers), {
          env: subprocessEnv(parentEnv),
          cwd: mkdtempSync(join(tmpdir(), "twc-claude-code-")),
          abortController,
        }),
      });
      const abort = () => {
        clearTimeout(timer);
        if (!abortController.signal.aborted) abortController.abort();
        release();
      };
      async function* messages(): AsyncGenerator<SdkMessageLike> {
        // Pre-prompt gate over the control channel: no task has been sent, so no model call yet.
        const init = await q.initializationResult();
        const status = await q.mcpServerStatus();
        const failures = preflight({
          mcp_servers: status.map((s) => ({
            name: s.name,
            status: s.status,
            source: typeof s.source === "string" ? s.source : null,
            tools: ((s as { tools?: Array<{ name: string }> }).tools ?? []).map((t) => t.name),
          })),
          agents: (init.agents ?? []).map((a) => a.name),
        });
        if (failures.length > 0) {
          abort();
          q.close();
          throw new PreflightError(failures);
        }
        release();
        for await (const m of q) yield m as unknown as SdkMessageLike;
      }
      return { messages: messages(), abort };
    },
  };
}
