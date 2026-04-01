import { z } from "zod";
import { ProviderConfigSchema } from "@peerbench/core";

export default {
  configSchema: z.object({
    judgeProvider: ProviderConfigSchema,
  }),
  aliases: ["RegressionCheckerScorer"],
  description:
    "Detects if known issues from previous conversations recur",
  longDescription: `The Regression Checker Scorer compares new conversations against a list of known issues from previous interactions to detect regressions.

**How it works:**
1. Takes a list of known issues (from previous QA or feedback)
2. Analyzes the current conversation for similar problems
3. Reports which issues recurred and which appear fixed
4. Assigns confidence levels to each regression match

**Score calculation:**
- Base penalties by severity: minor=0.1, moderate=0.2, severe=0.35
- Penalties are multiplied by confidence: high=100%, medium=70%, low=40%
- Score = 1.0 - total penalties (minimum 0)

**When to use:**
- Testing fixes for known bugs
- Monitoring agent quality over time
- Tracking improvement on specific issues`,
};
