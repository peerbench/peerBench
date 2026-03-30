import { z } from "zod";
import { ProviderConfigSchema } from "@peerbench/core";

export default {
  configSchema: z.object({
    judgeProvider: ProviderConfigSchema,
  }),
  aliases: ["TaskCompletionScorer"],
  description:
    "Evaluates whether the agent successfully completed the intended task",
  longDescription: `The Task Completion Scorer evaluates whether a conversation reached a satisfactory conclusion and the intended task was completed.

**How it works:**
1. Analyzes the full conversation flow
2. Looks for completion indicators (confirmations, summaries, next steps)
3. Identifies any blockers that prevented completion
4. Returns a completion score and binary completed flag

**Score interpretation:**
- 1.0 = Task fully completed with proper closure
- 0.7-0.9 = Mostly complete, minor elements missing
- 0.4-0.6 = Partially complete, significant gaps
- 0.0-0.3 = Task abandoned or failed

**Optional context:**
- expectedOutcome: What should happen (e.g., "Claim filed successfully")
- scenario: What type of task (e.g., "FNOL claim reporting")

**When to use:**
- End-to-end conversation testing
- Evaluating agent effectiveness
- Measuring task success rates`,
};
