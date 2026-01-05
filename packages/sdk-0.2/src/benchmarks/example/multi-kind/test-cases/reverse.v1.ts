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
 * This is the second test-case type for the multi-kind example.
 *
 * Notice how the schemas are structurally identical to the echo test case file; the difference
 * is the `kind` strings. Those `kind` values are what the runner uses to decide "what to do"
 * for a given test case.
 *
 * In a real benchmark, different kinds usually exist because the tasks are genuinely different
 * (e.g. `summarize`, `classify`, `extract`) and each task needs different prompting and scoring.
 */
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
