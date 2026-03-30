// Registry infrastructure
export * from "./registry";

// Config
export * from "./config";

// Schemas
export { SystemPromptConfigSchema, type SystemPromptConfig } from "./schemas/system-prompt-config";
export { ProviderConfigSchema, type ProviderConfig } from "./schemas/provider-config";

// Testing infrastructure (noop-dummy)
export * from "./testing";

// Utils
export { getDefaultAuthToken, injectDefaultAuthToken } from "./utils/default-auth-tokens";
export { escapeRegex } from "./utils/escape-regex";
export { extractTagContent } from "./utils/extract-tag-content";
export { isNonEmptyString } from "./utils/is-non-empty-string";
export { isNonNullRecord } from "./utils/is-non-null-record";
export { normalizeWhitespace } from "./utils/normalize-whitespace";
export { readString } from "./utils/read-string";
export { readNullableString } from "./utils/read-nullable-string";
export { readRequiredString } from "./utils/read-required-string";
export { readStringArray } from "./utils/read-string-array";
export { readRecord } from "./utils/read-record";
export { resolveEnvVariables } from "./utils/resolve-env-variables";
export { resolveSystemPrompt } from "./utils/resolve-system-prompt";
export { resolveUrlLike } from "./utils/resolve-url-like";
export { sha256 } from "./utils/sha256";
export { uniqueStrings } from "./utils/unique-strings";
export {
  RAW_REQUEST_METADATA_KEY,
  type RawRequestMetadata,
} from "./utils/raw-request";
export {
  PROMPT_METADATA_KEY,
  TRACE_METADATA_KEY,
  PROMPT_METADATA_HEADER,
  parsePromptMetadataHeader,
  parsePromptMetadataChunk,
  parseTraceMetadataChunk,
  extractPromptFields,
  type PromptMetadata,
  type TraceMetadata,
  type PromptDenormalizedFields,
} from "./utils/prompt-metadata";

// Re-export key types from peerbench SDK for convenience
export type { CallableLLM, CallableLLMForwardArgs, LLMResponse } from "peerbench/providers";
export type { AbstractScorer, BaseScorerResult } from "peerbench/scorers";
export type { AbstractStorage } from "peerbench/storages";
export type { RunnerResult, RunnerParams } from "peerbench";
export {
  BaseTestCaseSchemaV1,
  BaseResponseSchemaV1,
  BaseScoreSchemaV1,
  defineTestCaseSchema,
  defineResponseSchema,
  defineScoreSchema,
} from "peerbench/schemas";
export type { BaseTestCaseV1, BaseResponseV1, BaseScoreV1 } from "peerbench/schemas";
export { defineRunner, idGeneratorUUIDv7, ScoringMethod } from "peerbench";
export type { Id, IdGenerator, MaybePromise } from "peerbench";
