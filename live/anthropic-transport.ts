/**
 * Real Anthropic Messages API transport. Used ONLY by the live runner.
 * Not reachable from tool code (live/tools.ts import graph is audited).
 *
 * The base URL is pinned to the public API and the key comes only from ANTHROPIC_API_KEY,
 * so ambient environment routing is never used for project model calls.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MessagesRequest, MessagesResponse, ModelTransport } from "./agent-loop";

export const ANTHROPIC_PUBLIC_API = "https://api.anthropic.com";

export function anthropicTransport(apiKey: string): ModelTransport {
  const client = new Anthropic({ apiKey, baseURL: ANTHROPIC_PUBLIC_API, maxRetries: 2, timeout: 120_000 });
  return {
    kind: "anthropic-api",
    async create(req: MessagesRequest): Promise<MessagesResponse> {
      const res = await client.messages.create({
        model: req.model,
        max_tokens: req.max_tokens,
        tools: req.tools as unknown as Anthropic.Tool[],
        messages: req.messages as unknown as Anthropic.MessageParam[],
      });
      return {
        id: res.id,
        model: res.model,
        stop_reason: res.stop_reason,
        content: res.content as unknown as MessagesResponse["content"],
        usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
      };
    },
  };
}
