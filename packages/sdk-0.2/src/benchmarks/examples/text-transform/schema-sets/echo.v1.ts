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

export const TextTransformEchoKind = "llm/text-transform-echo" as const;

export const TextTransformEchoTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: TEXT_TRANSFORM_NAMESPACE,
  kind: TextTransformEchoKind,
  schemaVersion: 1,
  fields: {
    input: z.string(),
  },
});
export type TextTransformEchoTestCaseV1 = z.infer<
  typeof TextTransformEchoTestCaseSchemaV1
>;

export const TextTransformEchoResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: TEXT_TRANSFORM_NAMESPACE,
  kind: TextTransformEchoKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMResponseFieldsV1,
  },
});
export type TextTransformEchoResponseV1 = z.infer<
  typeof TextTransformEchoResponseSchemaV1
>;

export const TextTransformEchoScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: TEXT_TRANSFORM_NAMESPACE,
  kind: TextTransformEchoKind,
  schemaVersion: 1,
  fields: {
    match: z.boolean(),
  },
});
export type TextTransformEchoScoreV1 = z.infer<
  typeof TextTransformEchoScoreSchemaV1
>;
