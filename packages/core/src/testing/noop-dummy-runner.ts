import { z } from "zod";
import { idGeneratorUUIDv7 } from "../utils/id-generator";
import { ScoringMethod } from "../types/common";
import { defineRunner } from "../helpers/define-runner";
import type { CallableLLM } from "../types/provider";
import {
  NoOpDummyScoreSchemaV1,
  NoOpDummyResponseSchemaV1,
  type NoOpDummyTestCaseV1,
  NoOpDummyTestCaseSchemaV1,
} from "./noop-dummy-schema";
import { defineRunnerEntry } from "@/registry/runner";

const DUMMY_RESPONSE = "THIS IS A DUMMY RESPONSE";
const DUMMY_SCORE_REASONING = "THIS IS A DUMMY SCORER THE SCORE IS RANDOM";

const configSchema = z.object({
  delayMs: z
    .number()
    .optional()
    .describe("Simulated processing delay in milliseconds."),
  fixedScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Fixed score value (0-1). If not set, a random score is generated.",
    ),
});

const meta = {
  configSchema,
  supportedScorers: [] as string[],
  supportedStorages: ["noop-dummy"],
  description:
    "No-op runner for testing triggers and API without real computation",
  longDescription: `The NoOp Dummy runner is designed for testing system infrastructure without incurring any real computation costs.

**How it works:**
1. Receives a test case (ignores the actual content)
2. Returns a fixed dummy response
3. Returns a random score (or fixed score if configured)

**Use cases:**
- Testing trigger configurations
- Validating API endpoints
- Testing run infrastructure
- CI/CD pipeline validation
- Load testing without LLM costs`,
};

const run = defineRunner(
  async (params: {
    testCase: NoOpDummyTestCaseV1;
    target: CallableLLM;
    delayMs?: number;
    fixedScore?: number;
  }) => {
    const startedAt = Date.now();

    if (params.delayMs && params.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, params.delayMs));
    }

    const completedAt = Date.now();

    const response = await NoOpDummyResponseSchemaV1.newWithId(
      {
        output: DUMMY_RESPONSE,
        testCaseId: params.testCase.id,
        startedAt,
        completedAt,
      },
      idGeneratorUUIDv7,
    );

    const scoreValue =
      params.fixedScore !== undefined ? params.fixedScore : Math.random();

    const score = await NoOpDummyScoreSchemaV1.newWithId(
      {
        responseId: response.id,
        scoringMethod: ScoringMethod.algo,
        value: scoreValue,
        explanation: DUMMY_SCORE_REASONING,
        randomValue: scoreValue,
      },
      idGeneratorUUIDv7,
    );

    return { response, score };
  },
);

const noopDummyRunner = defineRunnerEntry({
  ...meta,
  async executeFromConfig(config, configSchema) {
    const params = configSchema!.parse(config.runnerParams);
    const result = await run({
      testCase: NoOpDummyTestCaseSchemaV1.parse(config.testCase) as NoOpDummyTestCaseV1,
      target: {} as CallableLLM,
      delayMs: params.delayMs,
      fixedScore: params.fixedScore,
    });
    return result as unknown as import("../types/runner").RunnerResult;
  },
});

export { noopDummyRunner, meta as noopDummyRunnerMeta };
