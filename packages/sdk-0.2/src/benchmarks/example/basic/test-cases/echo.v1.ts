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
 * Schemas are the core of a benchmark. They are the entities which hold the data.
 * There are three base different type of entities live inside a benchmark:
 * - Test case: Entity that holds a single input/task. That task often paired with an expected output (e.g multiple choice questions)
 * - Response: Entity that holds a model output for a test case in a structured format.
 * - Score: Entity that holds scoring result for a response.
 *
 * The hierarchy starts from test case, then response, then score. Every test case definition
 * must have a corresponding response and every response must have a corresponding score definition.
 * With this way we can easily identify each object in their own context.
 *
 * All of those entities are versioned via the `schemaVersion` field. Versions are recommended to
 * start at 1 and increment whenever the schema changes in a breaking way. Handling version changes
 * are the host application's responsibility.
 *
 * `kind` field, on the other hand, is a unique string that identifies the type of the entity. It is highly recommended
 * to use namespaced syntax (such as `example.ts.echo`) to avoid collisions with other entity kinds.
 *
 * Each entity also has a relation to the upper level entity in the hierarchy via its ID.
 * For instance: Scores have a `responseId` field and responses have a `testCaseId` field.
 * This way we can easily identify which entity is generated for which entity.
 *
 * Managing those relations are the host application's responsibility.
 *
 * Each entity must be following its base definition for the same type (e.g test case, response, score).
 * As long as the given `baseSchema` is an extension of the SDK level base schema (`BaseTestCaseSchemaV1` for instance),
 * you can pass a different base schema. For instance below you can find that we are using `BaseLLMChatResponseSchemaV1` as the
 * base schema for the response schema. We are doing this because this benchmark is for LLM chat models. If your response structured
 * in a different format, you can pass a different base schema.
 */
export const ExampleEchoTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "example.ts.echo",
  schemaVersion: 1,
  fields: {
    // Additional fields can be added here.
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
  // Additional fields can be added here.
  // We left it empty because we don't need to store anything additional.
  // fields: {
  // },
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
