import { BaseScoreSchemaV1, defineScoreSchema } from "@/schemas";
import { ExtensionLLMAsAJudgeScorerFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";

export const FNOLBaseScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  fields: {
    ...ExtensionLLMAsAJudgeScorerFieldsV1,
  },
});
