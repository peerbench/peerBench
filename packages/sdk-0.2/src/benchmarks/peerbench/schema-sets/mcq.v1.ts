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

export const MCQKind = `llm/mcq` as const;

export const MCQTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: MCQKind,
  schemaVersion: 1,
  fields: {
    question: z.string(),
    options: z.record(z.string(), z.string()),
    correctAnswerKeys: z.string().array(),
  },
});
export type MCQTestCaseV1 = z.infer<typeof MCQTestCaseSchemaV1>;

export const MCQResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: MCQKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMResponseFieldsV1,
  },
});
export type MCQResponseV1 = z.infer<typeof MCQResponseSchemaV1>;

export const MCQScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: MCQKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMAsAJudgeScoreFieldsV1,
    extractedAnswers: z.array(z.string()),
  },
});
export type MCQScoreV1 = z.infer<typeof MCQScoreSchemaV1>;
