import { z } from "zod";
import { ProviderConfigSchema } from "@peerbench/core";

export default {
  configSchema: z.object({
    judgeProvider: ProviderConfigSchema,
  }),
  aliases: ["ConversationQualityScorer"],
  description:
    "Assesses overall conversation quality across clarity, helpfulness, professionalism, and efficiency",
  longDescription: `The Conversation Quality Scorer provides a holistic assessment of agent response quality across four dimensions.

**Dimensions:**
1. **Clarity** (25% weight)
   - How easy to understand are the responses?
   - Is the language clear and unambiguous?

2. **Helpfulness** (30% weight)
   - Does the agent address customer needs?
   - Are responses relevant and useful?

3. **Professionalism** (20% weight)
   - Is the tone appropriate?
   - Is communication style suitable?

4. **Efficiency** (25% weight)
   - Does the agent get to the point?
   - Is the conversation progressing?

**Score interpretation:**
- 0.9-1.0 = Excellent quality
- 0.7-0.9 = Good quality
- 0.5-0.7 = Acceptable quality
- Below 0.5 = Needs improvement

**When to use:**
- General agent quality assessment
- Comparing agent performance
- Identifying areas for improvement`,
};
