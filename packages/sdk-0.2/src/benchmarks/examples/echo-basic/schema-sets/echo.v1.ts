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

/**
 * Schemas are the core components of a benchmark. They are the entities which hold the data.
 * There are three base different type of entities live inside a benchmark which are connected to each other:
 * - Test case: Entity that holds a single input/task. That task often paired with an expected output (e.g multiple choice questions, Q&A)
 * - Response: Entity that holds an output for a test case in a structured format.
 * - Score: Entity that holds scoring result for a response.
 *
 * The hierarchy starts from test case, then response, then score. Every test case definition
 * must have a corresponding response and every response must have a corresponding score definition.
 * With this way we can easily identify each object in their own context.
 *
 * All of those entities are versioned via the `schemaVersion` field. Versions are recommended to
 * start at 1 and increment whenever the schema changes in a breaking way. Handling version changes
 * are the runtime's responsibility.
 *
 * `kind` field is a unique string that identifies the type of the entity. Depends on the
 * entity type, kind field is extended as "*.tc" (test case), "*.rs" (response) or "*.sc" (score). Defining this field
 * allow you to have strong type safety and identity for the raw objects that are stored outside your codebase.
 *
 * `namespace` field is another string identifier that tells you where this object definition coming from.
 * It is recommended to use domain like syntax for it (such as "peerbench.ai" or "example.com") to avoid
 * collisions with other namespaces out there.
 *
 * Each entity also has a field that refers to the upper level entity in the hierarchy via its ID.
 * For instance: Scores have a `responseId` field and responses have a `testCaseId` field.
 * This way we can easily identify which entity is generated for which entity.
 *
 * Managing those relations are the runtime's responsibility.
 *
 * Each entity must be following its base definition defined by the SDK.
 * As long as the given `baseSchema` is an extension of the SDK level base schema (e.g `BaseTestCaseSchemaV1`),
 * you can pass a different base schema. You can extend the well-known fields for your schemas using the extensions
 * provided by the SDK. For instance below you can find that we are using `ExtensionLLMResponseFieldsV1` to extend the
 * response schema with LLM specific fields (because our benchmark focuses on LLM chat models).
 */

// For reusability, we define the kind and namespaces as constants
export const EchoBasicNamespace = "example.peerbench.ai" as const;
export const EchoBasicKind = "llm/echo-basic" as const;

export const EchoBasicTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: EchoBasicNamespace,
  kind: EchoBasicKind, // This will end up as "llm/echo-basic.tc"
  schemaVersion: 1,
  fields: {
    // Custom fields we want to store in this test case
    input: z.string(),
  },
});
// Having separate type definitions is good to easily refer to the schema data shape
export type EchoBasicTestCaseV1 = z.infer<typeof EchoBasicTestCaseSchemaV1>;

export const EchoBasicResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: EchoBasicNamespace,
  kind: EchoBasicKind, // This will end up as "llm/echo-basic.rs"
  schemaVersion: 1,
  fields: {
    // We are using the pre-defined/well-known fields for the response schema
    ...ExtensionLLMResponseFieldsV1,
  },
});
export type EchoBasicResponseV1 = z.infer<typeof EchoBasicResponseSchemaV1>;

export const EchoBasicScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: EchoBasicNamespace,
  kind: EchoBasicKind, // This will end up as "llm/echo-basic.sc"
  schemaVersion: 1,
  fields: {
    // We do not have special fields for a score object so we left it empty
  },
});
export type EchoBasicScoreV1 = z.infer<typeof EchoBasicScoreSchemaV1>;
