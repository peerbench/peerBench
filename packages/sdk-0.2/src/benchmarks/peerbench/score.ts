import { BaseScoreSchemaV1, defineScoreSchema } from "@/schemas";
import { ExtensionLLMAsAJudgeScorerFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";
import z from "zod";

export const PeerbenchBaseScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  fields: {
    ...ExtensionLLMAsAJudgeScorerFieldsV1,
  },
});
export type PeerbenchBaseScoreV1 = z.infer<typeof PeerbenchBaseScoreSchemaV1>;
