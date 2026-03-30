import { z } from "zod";
import { AbstractScorer, type BaseScorerResult } from "peerbench/scorers";
import { PEERBENCH_NAMESPACE } from "peerbench";
import { defineScorerEntry } from "@/registry/scorer";

const DUMMY_SCORE_REASONING = "THIS IS A DUMMY SCORER THE SCORE IS RANDOM";

class NoOpDummyScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/noop-dummy.scorer`,
) {
  private fixedScore?: number;

  constructor(config: { provider?: unknown; fixedScore?: number }) {
    super();
    this.fixedScore = config.fixedScore;
  }

  async score(_params: {
    response?: unknown;
    testCase?: unknown;
  }): Promise<BaseScorerResult> {
    const scoreValue =
      this.fixedScore !== undefined ? this.fixedScore : Math.random();

    return {
      value: scoreValue,
      explanation: DUMMY_SCORE_REASONING,
    };
  }
}

const configSchema = z.object({
  fixedScore: z
    .number()
    .optional()
    .describe(
      "Fixed score value (0-1). If not set, a random score is generated.",
    ),
});

const meta = {
  configSchema,
  aliases: ["NoOpDummyScorer"],
  description: "Returns random scores for testing without real computation",
  longDescription: `The NoOp Dummy scorer is designed for testing system infrastructure without real computation.

**How it works:**
1. Ignores the actual response and test case content
2. Returns a random score between 0 and 1 (or fixed if configured)
3. Always returns a fixed dummy explanation

**Use cases:**
- Testing scoring infrastructure
- Validating run pipelines
- CI/CD pipeline testing
- Load testing without LLM costs`,
};

const noopDummyScorer = defineScorerEntry({
  ...meta,
  instantiateFromConfig(config, configSchema) {
    const { fixedScore } = configSchema!.parse(config);
    return new NoOpDummyScorer({ fixedScore });
  },
});

export { NoOpDummyScorer, noopDummyScorer, meta as noopDummyScorerMeta };
