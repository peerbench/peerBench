import {
  BaseResponseSchemaV1,
  BaseScoreSchemaV1,
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { ExtensionLLMResponseFieldsV1 } from "@/schemas/extensions/response/llm";
import { z } from "zod";
import { TEXT_TRANSFORM_NAMESPACE } from "./namespace";

export const TextTransformReverseKind = "llm/text-transform-reverse" as const;

export const TextTransformReverseTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: TEXT_TRANSFORM_NAMESPACE,
  kind: TextTransformReverseKind,
  schemaVersion: 1,
  fields: {
    input: z.string(),
  },
});
export type TextTransformReverseTestCaseV1 = z.infer<
  typeof TextTransformReverseTestCaseSchemaV1
>;

export const TextTransformReverseResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: TEXT_TRANSFORM_NAMESPACE,
  kind: TextTransformReverseKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMResponseFieldsV1,
  },
});
export type TextTransformReverseResponseV1 = z.infer<
  typeof TextTransformReverseResponseSchemaV1
>;

export const TextTransformReverseScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: TEXT_TRANSFORM_NAMESPACE,
  kind: TextTransformReverseKind,
  schemaVersion: 1,
  fields: {
    match: z.boolean(),
    expected: z.string(),
  },
});
export type TextTransformReverseScoreV1 = z.infer<
  typeof TextTransformReverseScoreSchemaV1
>;
