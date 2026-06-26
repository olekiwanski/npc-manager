import { query } from "@anthropic-ai/claude-agent-sdk";
import { SYSTEM_PROMPT, REVIEW_SCHEMA, REVIEW_JSON_SCHEMA, type Review } from "../common/review-schema.js";

export async function reviewDiff(diff: string): Promise<Review> {
  const result = query({
    prompt: `Review this diff:\n\n${diff}`,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: "claude-sonnet-4-6",
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

    throw new Error(`Review failed (${message.subtype}): ${message.errors.join("; ")}`);
  }

  throw new Error("Agent returned no result");
}
