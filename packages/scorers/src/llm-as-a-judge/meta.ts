import { z } from "zod";
import { ProviderConfigSchema } from "@peerbench/core";

export default {
  configSchema: z.object({
    judgeProvider: ProviderConfigSchema,
  }),
  aliases: ["LLMAsAJudgeScorer"],
  description:
    "Uses an LLM to judge response quality against defined criteria",
  longDescription: `The LLM-as-a-Judge scorer leverages a large language model (e.g., GPT-4, Claude, Gemini) to evaluate AI responses against specified criteria and rubrics.

**How it works:**
1. The scorer receives the AI response to be evaluated
2. A rubric (evaluation guidelines) and criteria (specific aspects to score) are provided
3. The judge LLM analyzes the response against each criterion
4. For each criterion, the judge assigns a numeric score (typically 0-1) with an explanation
5. A weighted average produces the final score

**Criteria Examples:**
- Semantic similarity to a reference response
- Correctness of extracted information
- Reasoning quality and coherence
- Adherence to instructions

**When to use:**
- When deterministic scoring is not possible (subjective quality)
- When comparing responses to reference answers
- When evaluating open-ended responses
- When scoring requires reasoning about content

**Configuration:**
- \`llmJudgeModel\`: The model to use for judging (e.g., "google/gemini-2.5-flash-lite")
- \`llmJudgeSystemPrompt\`: Optional custom system prompt for the judge
- \`criteria\`: Array of scoring criteria with id, description, and weight`,
};
