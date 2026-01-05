import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { BaseScoreSchemaV1 } from "@/schemas/score";

export const ExampleMKEchoTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "example.mk.ts.echo",
  schemaVersion: 1,
  fields: {
    input: z.string(),
  },
});
export type ExampleMKEchoTestCaseV1 = z.infer<
  typeof ExampleMKEchoTestCaseSchemaV1
>;

export const ExampleMKEchoResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "example.mk.rs.echo",
  schemaVersion: 1,
});
export type ExampleMKEchoResponseV1 = z.infer<
  typeof ExampleMKEchoResponseSchemaV1
>;

export const ExampleMKEchoScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  kind: "example.mk.sc.echo",
  schemaVersion: 1,
  fields: {
    match: z.boolean(),
  },
});
export type ExampleMKEchoScoreV1 = z.infer<typeof ExampleMKEchoScoreSchemaV1>;
