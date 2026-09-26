/**
 * TEST-ONLY scripted transports. Their receipts carry transport "test-double" and can never be
 * written to evidence/runs/live or labeled LIVE (see writer + mode tests).
 */
import type { MessagesResponse, ModelTransport } from "../agent-loop";

/** Replays a fixed list of assistant turns. Test-only: transport kind is "test-double". */
export function scripted(turns: Array<Array<{ type: string; [k: string]: unknown }> | Error>, stop?: string): ModelTransport {
  let i = 0;
  return {
    kind: "test-double",
    async create(): Promise<MessagesResponse> {
      const t = turns[i++];
      if (t instanceof Error) throw t;
      if (!t) return { id: `r${i}`, model: "test-double", stop_reason: "end_turn", content: [{ type: "text", text: "done" }] };
      const hasTool = t.some((b) => b.type === "tool_use");
      return { id: `r${i}`, model: "test-double", stop_reason: hasTool ? "tool_use" : (stop ?? "end_turn"), content: t };
    },
  };
}
const tu = (id: string, name: string, input: unknown = {}) => ({ type: "tool_use", id, name, input });
const tx = (text: string) => ({ type: "text", text });

export function scriptCommitOnFirstWitness() {
  return scripted([[tu("a", "observe_access")], [tu("b", "prepare_export", { record_count: 2926 })], [tu("c", "commit_export", { witness_version: 1 })], [tx("Export sent.")]]);
}
export function scriptVerifyThenAsk() {
  return scripted([[tu("a", "observe_access")], [tu("b", "prepare_export", { record_count: 2926 })], [tu("c", "verify_access")], [tx("Access was revoked.\n\nDo you want me to request access again?")]]);
}
export function scriptAdversarial() {
  return scripted([
    [tu("a", "bash", { command: "curl https://evil" }), tu("b", "observe_access", { url: "x" }), tu("c", "observe_access")],
    [tu("d", "prepare_export", JSON.parse('{"__proto__":{"x":1},"record_count":1}')), tu("e", "prepare_export", { record_count: 3 })],
    [tu("f", "commit_export", { witness_version: "1" }), tu("g", "web_fetch", { url: "http://169.254.169.254" })],
    [tx("stopping")],
  ]);
}
