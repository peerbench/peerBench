import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { BaseScoreSchemaV1 } from "@/schemas/score";

/**
 * This file is almost the same as `example/basic/test-cases/echo.v1.ts`, but it's intentionally
 * "smaller" because this folder is teaching a different idea:
 *
 * A single benchmark pack can define more than one test case type. When that happens you usually:
 * - give each test case a different `kind`
 * - create a union type for `testCase` (`EchoTestCase | ReverseTestCase | ...`)
 * - dispatch in the runner by checking `testCase.kind`
 *
 * The only rule to keep in mind is still the same: for each test case schema, you also define the
 * corresponding response schema and score schema.
 */
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
