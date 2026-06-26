import { reviewDiff } from "./agent/reviewer.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const diff = await readStdin();

if (!diff.trim()) {
  console.error("No diff on stdin. Usage: git diff | npx tsx src/index.ts");
  process.exit(1);
}

const prTitle = process.env.PR_TITLE ?? "";
const prBody = process.env.PR_BODY ?? "";

console.log(JSON.stringify(await reviewDiff(diff, { prTitle, prBody }), null, 2));
