import { PEERBENCH_NAMESPACE } from "@/constants";
import {
  BaseResponseSchemaV1,
  BaseScoreSchemaV1,
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { ExtensionLLMResponseFieldsV1 } from "@/schemas/extensions/response/llm";
import { ExtensionLLMAsAJudgeScoreFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";
import { z } from "zod";

export const QAKind = `llm/qa` as const;

export const QATestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: QAKind,
  schemaVersion: 1,
  fields: {
    question: z.string(),
    goodAnswers: z.string().array(),
    badAnswers: z.string().array(),
  },
});
export type QATestCaseV1 = z.infer<typeof QATestCaseSchemaV1>;

export const QAResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: QAKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMResponseFieldsV1,
  },
});
export type QAResponseV1 = z.infer<typeof QAResponseSchemaV1>;

export const QAScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: QAKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMAsAJudgeScoreFieldsV1,
  },
});
export type QAScoreV1 = z.infer<typeof QAScoreSchemaV1>;
