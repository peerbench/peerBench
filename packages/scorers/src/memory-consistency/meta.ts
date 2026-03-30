import { z } from "zod";
import { ProviderConfigSchema } from "@peerbench/core";

export default {
  configSchema: z.object({
    judgeProvider: ProviderConfigSchema,
  }),
  aliases: ["MemoryConsistencyScorer"],
  description:
    "Detects when an agent asks for information the customer already provided",
  longDescription: `The Memory Consistency Scorer analyzes conversations to identify memory lapses - instances where the AI agent asks for information that the customer has already provided earlier in the conversation.

**How it works:**
1. The scorer analyzes the full conversation history
2. It identifies when the agent requests information that was previously given
3. Each memory lapse is documented with the turn number and details

**Score interpretation:**
- 1.0 = Perfect memory, no lapses detected
- 0.0 = ANY memory lapse detected (zero tolerance - asking for the same info twice is unacceptable)

**When to use:**
- Multi-turn conversation testing
- Evaluating agent's context retention
- Identifying issues with conversation history handling`,
};
