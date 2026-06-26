import { query } from "@anthropic-ai/claude-agent-sdk";
import { SYSTEM_PROMPT, REVIEW_SCHEMA, REVIEW_JSON_SCHEMA, type Review } from "../common/review-schema.js";

export async function reviewDiff(
  diff: string,
  opts: { prTitle?: string; prBody?: string; model?: string } = {}
): Promise<Review> {
  const contextParts: string[] = [];
  if (opts.prTitle) contextParts.push(`PR Title: ${opts.prTitle}`);
  if (opts.prBody) contextParts.push(`PR Description:\n${opts.prBody}`);
  contextParts.push(`Diff:\n${diff}`);

  const result = query({
    prompt: `Review this pull request:\n\n${contextParts.join("\n\n")}`,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: opts.model ?? "claude-sonnet-4-6",
      tools: [],
      maxTurns: 2,
      maxBudgetUsd: 0.1,
      outputFormat: { type: "json_schema", schema: REVIEW_JSON_SCHEMA },
    },
  });

  for await (const message of result) {
    if (message.type !== "result") continue;

    if (message.subtype === "success") {
      const parsed = REVIEW_SCHEMA.safeParse(message.structured_output);
      if (!parsed.success) {
        throw new Error(`Invalid structured output: ${parsed.error.message}`);
      }
      console.error(`[info] cost: $${message.total_cost_usd.toFixed(6)} | turns: ${message.num_turns}`);
      return parsed.data;
    }

    throw new Error(`Review failed (${message.subtype}): ${(message.errors ?? []).join("; ")}`);
  }

  throw new Error("Agent returned no result");
}
