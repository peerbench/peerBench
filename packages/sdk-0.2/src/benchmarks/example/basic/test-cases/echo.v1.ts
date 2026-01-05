import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { ExampleBaseScoreSchemaV1 } from "../score";

/**
 * Tutorial: schemas are the SDK's "source of truth".
 *
 * If you only remember one thing when adding a benchmark, remember this:
 * define your data shape at runtime (Zod), then derive TypeScript types from it.
 *
 * Every persisted entity is versioned with:
 * - `kind`: a stable string identifier (namespaced is recommended)
 * - `schemaVersion`: a number you increment when the schema changes
 *
 * Linking between entities is by ID:
 * - a Response points to its input via `testCaseId`
 * - a Score points to what it evaluated via `responseId`
 *
 * Those links are what allow host apps to store entities independently while still being joinable later.
 */
export const ExampleEchoTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "example.ts.echo",
  schemaVersion: 1,
  fields: {
    instruction: z.string(),
    input: z.string(),
    expectedOutput: z.string(),
  },
});
export type ExampleEchoTestCaseV1 = z.infer<typeof ExampleEchoTestCaseSchemaV1>;

export const ExampleEchoResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "example.rs.echo",
  schemaVersion: 1,
});
export type ExampleEchoResponseV1 = z.infer<typeof ExampleEchoResponseSchemaV1>;

export const ExampleEchoScoreSchemaV1 = defineScoreSchema({
  baseSchema: ExampleBaseScoreSchemaV1,
  kind: "example.sc.echo",
  schemaVersion: 1,
  fields: {
    // Benchmark-specific score fields can be added here.
    match: z.boolean(),
  },
});
export type ExampleEchoScoreV1 = z.infer<typeof ExampleEchoScoreSchemaV1>;
