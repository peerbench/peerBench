import { BaseScoreSchemaV1, defineScoreSchema } from "@/schemas";
import { ExtensionLLMAsAJudgeScorerFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";
import z from "zod";

/**
 * "Score" entities are what you store (or export) after a test case is evaluated.
 *
 * The SDK provides a `BaseScoreSchemaV1` with the common fields (`value`, `responseId`, etc).
 * A benchmark can extend that base schema in two ways:
 *
 * - by adding benchmark-specific fields (like `match`, `accuracyBreakdown`, `rubricId`, ...)
 * - by mixing in extension bundles (like `ExtensionLLMAsAJudgeScorerFieldsV1`) so the same score
 *   can carry judge metadata when an AI scorer is used
 *
 * This file defines a reusable "base score schema" for the example benchmark pack. Test-case-specific
 * score schemas (like `ExampleEchoScoreSchemaV1`) can then extend this base again.
 */
export const ExampleBaseScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  fields: {
    ...ExtensionLLMAsAJudgeScorerFieldsV1,
    normalized: z
      .object({
        expected: z.string(),
        actual: z.string(),
      })
      .optional(),
  },
});

export type ExampleBaseScoreV1 = z.infer<typeof ExampleBaseScoreSchemaV1>;
