import { z } from "zod";

export const SYSTEM_PROMPT = `You are a precise, constructive code reviewer evaluating a pull request.
Score the diff on five criteria on a scale of 1-10 (1 = critical issues, 10 = exemplary):
implementation correctness, idiomaticity, complexity, test coverage relative to risk, security.
Then issue a binding verdict (pass/fail) for the entire change and include a short summary (2-3 sentences)
in Markdown that gives the PR author clear, actionable next steps.`;

// Scores as z.number(): the SDK's structured output rejects min/max on integers,
// so the 1-10 range is enforced via field descriptions and the system prompt.
export const REVIEW_SCHEMA = z.object({
  implementationCorrectness: z
    .number()
    .describe("Implementation correctness: does the code do what it claims (scale 1-10)"),
  idiomaticity: z.number().describe("Idiomaticity: alignment with language and project conventions (scale 1-10)"),
  complexity: z.number().describe("Complexity: simplicity of the solution relative to the problem (scale 1-10)"),
  testRiskCoverage: z.number().describe("Test coverage proportional to the risk of changed code paths (scale 1-10)"),
  securitySafety: z.number().describe("Security: absence of vulnerabilities and secret leaks (scale 1-10)"),
  verdict: z.enum(["pass", "fail"]).describe("Binding verdict for the entire change"),
  summary: z.string().describe("Markdown summary ready to post as a PR comment"),
});

// target: "draft-07" required for Claude Agent SDK outputFormat compatibility
export const REVIEW_JSON_SCHEMA = z.toJSONSchema(REVIEW_SCHEMA, { target: "draft-07" });

export type Review = z.infer<typeof REVIEW_SCHEMA>;
