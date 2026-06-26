import { query } from "@anthropic-ai/claude-agent-sdk";
import { SYSTEM_PROMPT, REVIEW_SCHEMA, REVIEW_JSON_SCHEMA, type Review } from "./common/review-schema.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function reviewDiff(diff: string): Promise<Review> {
  const result = query({
    prompt: `Zrecenzuj ten diff:\n\n${diff}`,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: "claude-sonnet-4-6",
      tools: [],
      maxTurns: 2,
      outputFormat: { type: "json_schema", schema: REVIEW_JSON_SCHEMA },
    },
  });

  for await (const message of result) {
    if (message.type !== "result") continue;

    if (message.subtype === "success") {
      const parsed = REVIEW_SCHEMA.safeParse(message.structured_output);
      if (!parsed.success) {
        throw new Error(`Niepoprawny structured output: ${parsed.error.message}`);
      }
      console.error(`[info] koszt: $${message.total_cost_usd.toFixed(6)} | tury: ${message.num_turns}`);
      return parsed.data;
    }

    throw new Error(`Review nieudane (${message.subtype}): ${message.errors.join("; ")}`);
  }

  throw new Error("Agent nie zwrócił wyniku");
}

const diff = await readStdin();

if (!diff.trim()) {
  console.error("Brak diffa na stdin. Użyj: git diff | npx tsx src/index.ts");
  process.exit(1);
}

console.log(JSON.stringify(await reviewDiff(diff), null, 2));
