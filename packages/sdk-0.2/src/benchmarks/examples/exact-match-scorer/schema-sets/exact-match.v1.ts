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

export const ExactMatchNamespace = "example.peerbench.ai" as const;
export const ExactMatchKind = "llm/exact-match" as const;

export const ExactMatchTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: ExactMatchNamespace,
  kind: ExactMatchKind,
  schemaVersion: 1,
  fields: {
    instruction: z.string(),
    input: z.string(),
    expectedOutput: z.string(),
    normalize: z.boolean().optional(),
  },
});
export type ExactMatchTestCaseV1 = z.infer<typeof ExactMatchTestCaseSchemaV1>;

export const ExactMatchResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: ExactMatchNamespace,
  kind: ExactMatchKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMResponseFieldsV1,
  },
});
export type ExactMatchResponseV1 = z.infer<typeof ExactMatchResponseSchemaV1>;

export const ExactMatchScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: ExactMatchNamespace,
  kind: ExactMatchKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMAsAJudgeScoreFieldsV1,
    match: z.boolean(),
    normalized: z
      .object({
        expected: z.string(),
        actual: z.string(),
      })
      .optional(),
  },
});
export type ExactMatchScoreV1 = z.infer<typeof ExactMatchScoreSchemaV1>;
