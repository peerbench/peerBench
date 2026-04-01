// Registry infrastructure
export * from "./registry";

// Config
export * from "./config";

// Types (migrated from sdk-0.2)
export * from "./types";

// Schemas
export { SystemPromptConfigSchema, type SystemPromptConfig } from "./schemas/system-prompt-config";
export { ProviderConfigSchema, type ProviderConfig } from "./schemas/provider-config";
export { IdSchema } from "./schemas/id";
export {
  BaseTestCaseSchemaV1,
  defineTestCaseSchema,
  type BaseTestCaseV1,
} from "./schemas/base-test-case";
export {
  BaseResponseSchemaV1,
  defineResponseSchema,
  type BaseResponseV1,
} from "./schemas/base-response";
export {
  BaseScoreSchemaV1,
  defineScoreSchema,
  type BaseScoreV1,
} from "./schemas/base-score";
export {
  BaseSystemPromptSchemaV1,
  defineSystemPromptSchema,
  SimpleSystemPromptSchemaV1,
  type BaseSystemPromptV1,
  type SimpleSystemPromptV1,
} from "./schemas/base-system-prompt";
export { buildSchemaDefiner } from "./schemas/schema-definer";

// Helpers
export { defineRunner } from "./helpers/define-runner";

// Testing infrastructure (noop-dummy)
export * from "./testing";

// Utils
export { getDefaultAuthToken, injectDefaultAuthToken } from "./utils/default-auth-tokens";
export { escapeRegex } from "./utils/escape-regex";
export { extractTagContent } from "./utils/extract-tag-content";
export { idGeneratorUUIDv7 } from "./utils/id-generator";
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
