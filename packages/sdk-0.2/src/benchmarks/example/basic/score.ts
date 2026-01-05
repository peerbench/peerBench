import { BaseScoreSchemaV1, defineScoreSchema } from "@/schemas";
import { ExtensionLLMAsAJudgeScorerFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";
import z from "zod";

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

