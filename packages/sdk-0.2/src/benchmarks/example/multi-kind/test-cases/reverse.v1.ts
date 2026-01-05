import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { BaseScoreSchemaV1 } from "@/schemas/score";

export const ExampleMKReverseTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "example.mk.ts.reverse",
  schemaVersion: 1,
  fields: {
    input: z.string(),
  },
});
export type ExampleMKReverseTestCaseV1 = z.infer<
  typeof ExampleMKReverseTestCaseSchemaV1
>;

export const ExampleMKReverseResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "example.mk.rs.reverse",
  schemaVersion: 1,
});
export type ExampleMKReverseResponseV1 = z.infer<
  typeof ExampleMKReverseResponseSchemaV1
>;

export const ExampleMKReverseScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  kind: "example.mk.sc.reverse",
  schemaVersion: 1,
  fields: {
    match: z.boolean(),
  },
});
export type ExampleMKReverseScoreV1 = z.infer<
  typeof ExampleMKReverseScoreSchemaV1
>;
