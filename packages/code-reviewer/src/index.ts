import { reviewDiff } from "./agent/reviewer.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const diff = await readStdin();

if (!diff.trim()) {
  console.error("Brak diffa na stdin. Użyj: git diff | npx tsx src/index.ts");
  process.exit(1);
}

console.log(JSON.stringify(await reviewDiff(diff), null, 2));
