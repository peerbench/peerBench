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
 * This example is about "multiple scorer implementations", so the test case includes what both scorers
 * would need:
 *
 * - the prompt we will send to the model
 * - the list of required keywords we want to check for in the model output
 *
 * The interesting part is not the schema itself, but how the runner can accept different scorer objects
 * and still output the same score entity shape.
 */
export const ExampleMSKeywordsTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "example.ms.ts.keywords",
  schemaVersion: 1,
  fields: {
    prompt: z.string(),
    requiredKeywords: z.array(z.string()).min(1),
  },
});
export type ExampleMSKeywordsTestCaseV1 = z.infer<
  typeof ExampleMSKeywordsTestCaseSchemaV1
>;

export const ExampleMSKeywordsResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "example.ms.rs.keywords",
  schemaVersion: 1,
});
export type ExampleMSKeywordsResponseV1 = z.infer<
  typeof ExampleMSKeywordsResponseSchemaV1
>;

export const ExampleMSKeywordsScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  kind: "example.ms.sc.keywords",
  schemaVersion: 1,
  fields: {
    present: z.array(z.string()),
    missing: z.array(z.string()),
  },
});
export type ExampleMSKeywordsScoreV1 = z.infer<
  typeof ExampleMSKeywordsScoreSchemaV1
>;
