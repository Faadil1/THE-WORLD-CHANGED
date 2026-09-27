/**
 * Live execution interface for the Live Agent Lab (product/LIVE-AGENT-LAB.md).
 *
 *   AgentExecutor      runs one genuine agent against a ScenarioEnvironment
 *   ScenarioEnvironment the sandbox world + seed (only the canonical authority scenario today)
 *   ObservableRun      the resulting observable receipt (LiveReceipt) + timing
 *
 * It composes the existing, proven pieces — runClaudeCodeLoop, the Claude Code SDK driver,
 * buildLiveReceipt — without changing them. live/run-live.ts remains the operator entry point.
 * This module is Node-side only: it is never bundled into the public site (no executor exists
 * in the browser), and it is outside the audited model path like the transports.
 */
import { runClaudeCodeLoop, type ClaudeCodeDriver } from "./claude-code-loop";
import { claudeCodeDriver, describeQueryConfig } from "./claude-code-transport";
import { buildLiveReceipt, type LiveReceipt } from "./receipt";
import { SandboxSession } from "./tools";

export type ScenarioEnvironment = {
  scenario: "authority-expired";
  seed: string;
};

export type ObservableRun = {
  receipt: LiveReceipt;
  started_at: string;
  ended_at: string;
};

export interface AgentExecutor {
  /** "claude-code-sdk" for a genuine run; "test-double" in tests (never genuine). */
  readonly transport: ClaudeCodeDriver["kind"];
  execute(env: ScenarioEnvironment): Promise<ObservableRun>;
}

/** Executor over any Claude Code driver (the real SDK driver, or a test double). */
export function executorFromDriver(driver: ClaudeCodeDriver, transportConfig: Record<string, unknown> | null): AgentExecutor {
  return {
    transport: driver.kind,
    async execute(env) {
      if (env.scenario !== "authority-expired") throw new Error(`no live environment for scenario ${env.scenario}`);
      const session = new SandboxSession(env.seed);
      const started = new Date();
      const loop = await runClaudeCodeLoop(driver, session);
      const ended = new Date();
      return { receipt: buildLiveReceipt(loop, started, ended, transportConfig), started_at: started.toISOString(), ended_at: ended.toISOString() };
    },
  };
}

/** The genuine executor: Claude Code SDK with the operator's existing login (same as run-live.ts). */
export function claudeCodeExecutor(parentEnv: Readonly<Record<string, string | undefined>>): AgentExecutor {
  return executorFromDriver(claudeCodeDriver(parentEnv), describeQueryConfig());
}
