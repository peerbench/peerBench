# Agent Memory

## Project Overview

- **peerBench** — monorepo for a benchmarking platform for AI systems
- Published as `peerbench` on npm (v0.0.9), MIT license, ESM only (no CommonJS)
- Homepage: https://peerbench.ai
- Package manager: npm
- Build: tsup + tsc + tsc-alias
- Monorepo tool: turborepo

## Repo Map

- `apps/webapp` — Next.js 15 web app (Drizzle ORM, Supabase for auth + DB)
- `packages/sdk` — legacy SDK, being superseded
- `packages/sdk-0.2` — new experimental SDK, runtime-first design. This is the active development target.

## SDK 0.2 — Core Concepts

The SDK provides portable, reusable building blocks for AI benchmarking. It draws a clear line between what the SDK owns and what the host application (runtime) owns.

**SDK owns:** entity schemas, runner/scorer/provider contracts, storages, aggregators, reusable utilities.
**Runtime owns:** data ingestion, orchestration (parallelism, retries, persistence, UI), secrets, migration strategies.

### Terminology

- **Runtime / Host application** — any codebase that uses the SDK (CLI, webapp, worker, etc.)
- **Kind** — stable string identifier for entity types (e.g. `llm/echo-basic`)
- **SchemaVersion** — integer version of an entity shape, bumped on breaking changes
- **Namespace** — owner identifier (e.g. `peerbench.ai`, `example.peerbench.ai`)

## SDK 0.2 — Architecture

### Entities (plain JSON objects, Zod-validated)

Three core entities form a chain: `TestCase -> Response -> Score`. Relationships are tracked via IDs (`response.testCaseId`, `score.responseId`).

Every entity has three standard fields: `kind`, `schemaVersion`, `namespace`.

Schema definitions use `buildSchemaDefiner()` which returns a factory function. Each entity type has its own definer:
- `defineTestCaseSchema()` — from `peerbench/schemas`
- `defineResponseSchema()` — from `peerbench/schemas`
- `defineScoreSchema()` — from `peerbench/schemas`

Schemas get `.new()` (provide your own ID) and `.newWithId()` (use an `IdGenerator`) factory methods automatically.

**Base schemas:** `BaseTestCaseSchemaV1`, `BaseResponseSchemaV1`, `BaseScoreSchemaV1`

**Schema extensions** provide reusable field sets:
- `ExtensionLLMResponseFieldsV1` — `data`, `modelSlug`, `provider`, `systemPromptId`, token/cost fields
- `ExtensionLLMAsAJudgeScoreFieldsV1` — scorer provider/model/token/cost fields

**System prompts** are LLM-specific. Schemas live under `src/schemas/llm/`:
- `SimpleSystemPromptSchemaV1` — basic system prompt with `content` and `version`

### Providers (class-based)

Providers are the runtime bridge to model endpoints. Runners call providers, not models directly.

**Abstract base:**
- `AbstractProvider` — defines `kind` property and `withKind()` static factory method
- `AbstractLLMProvider extends AbstractProvider` — defines `forward(args: LLMProviderForwardArgs): Promise<ChatResponse>`

**`LLMProviderForwardArgs`:** `{ messages, model, abortSignal?, temperature?, responseFormat? }`

**`ChatResponse`:** `{ data, startedAt, completedAt, inputTokensUsed?, outputTokensUsed?, inputCost?, outputCost?, metadata? }`

**Concrete providers:**
- `OpenAIProvider` (kind: `peerbench.ai/llm/openai`) — wraps OpenAI SDK, built-in retry logic, rate limiting
- `OpenRouterProvider` (kind: `peerbench.ai/llm/openrouter.ai`) — fetches and caches model list for 24h, calculates costs via `Decimal.js`, delegates to internal `OpenAIProvider`
- `MastraProvider` (kind: `peerbench.ai/llm/mastra`) — wraps Mastra client, supports agent introspection (`getAgentInfo`, `getAgents`), accepts `memory` and `underlyingModel`
- `ExampleEchoLLMProvider` — echoes last user message (for testing)
- `ExampleRestApiLLMAgentProvider` — demonstrates custom REST API integration

**`withKind()` pattern:** All providers use `AbstractLLMProvider.withKind("kind-string")` to create a typed subclass with a static + instance `kind` property.

### Runners (function-based, per-test-case)

A runner executes one test case and returns `{ response, score? }`. Orchestration (looping over many test cases) is the runtime's job.

**`defineRunner(config, fn)`** — helper that creates a typed runner function with:
- `schemaSets` — array of `{ testCase, response, score }` schema triplets the runner supports
- `providers` — array of provider constructors the runner accepts
- `scorers` — array of scorer constructors the runner accepts
- `runConfigSchema` — Zod shape for runtime-provided config (validated automatically)
- `defaults` — optional default scorer, ID generators

The returned function auto-validates `runConfig`, provides default ID generators, and attaches a `.config` property.

**`Runner` type:** generic over `TTestCase, TResponse, TScore, TProvider, TScorer, TRunConfig`. Params: `{ testCase, provider, scorer?, runConfig, idGenerators? }`.

**Built-in runners:**
- `peerbenchRunner` — supports MCQ and QA test cases, MCQScorer + LLMAsAJudgeScorer, system prompts, Handlebars template variables

### Scorers (class-based)

**Abstract base:** `AbstractScorer` — defines `kind` and `score()` method, uses same `withKind()` pattern as providers.

**`BaseScorerResult`:** `{ value: number, explanation?: string, metadata? }`

**Concrete scorers:**
- `MCQScorer` — regex-based multiple choice answer extraction
- `RegexScorer` — generic regex pattern matching
- `LLMAsAJudgeScorer` (kind: `peerbench.ai/llm-as-a-judge`) — LLM-based evaluation
  - Accepts `provider` (an `AbstractLLMProvider`) and optional `model` in constructor
  - Supports weighted criteria with configurable scales
  - Returns normalized `value` in `0..1` range
  - Supports `fieldsToExtract` (Zod shape) for structured extraction alongside scoring
  - Uses `responseFormat: json_schema` for structured output

### Storages (class-based, abstract + implementations)

**Abstract:** `AbstractStorage<TObject>` — `init()`, `read(key)`, `readAll()`, `write(key, value)`, `count()`

**Implementations:**
- `FileStorage` — file-based with custom codecs
- `JSONFileStorage` — JSON array files
- `SQLiteStorage` — SQLite with codec pattern (uses `better-sqlite3`)
- `HttpStorage` — remote URL-backed with codec pattern

### Aggregators (class-based, reducer-style)

**Abstract:** `AbstractAggregator` — `push({ score, testCase?, response? })`, `aggregate(config?)`

Designed for streaming: push results one-by-one, then aggregate. Avoids materializing entire datasets in memory.

## SDK 0.2 — Package Exports

```
peerbench              → types, errors, utils, constants, helpers (defineRunner, idGeneratorUUIDv7)
peerbench/benchmarks   → built-in benchmark runners (peerbenchRunner, etc.)
peerbench/providers    → abstract + concrete providers
peerbench/schemas      → base schemas, schema definers
peerbench/schemas/llm  → system prompt schemas
peerbench/schemas/extensions → ExtensionLLMResponseFieldsV1, ExtensionLLMAsAJudgeScoreFieldsV1
peerbench/scorers      → abstract + concrete scorers
peerbench/storages     → abstract + concrete storages
peerbench/aggregators  → abstract + concrete aggregators
```

## SDK 0.2 — Key Dependencies

- `zod` v4 (NOT v3)
- `openai` v6 (for types like `ChatCompletionMessageParam`, `ResponseFormat`)
- `@mastra/client-js` v0.17
- `better-sqlite3` v12
- `handlebars` v4 (for template variables in runners)
- `decimal.js` v10 (for accurate cost calculations in OpenRouter)
- `jsonrepair` v3 (for fixing malformed LLM JSON responses)
- `uuid` v11 (for UUIDv7 ID generation)

## SDK 0.2 — Example Benchmarks

Located under `src/benchmarks/examples/`:
- `echo-basic` — minimal schema set + runner + storage examples
- `text-transform` — one runner supporting multiple kinds + deterministic scoring
- `exact-match-scorer` — scorer dispatch pattern (algorithmic vs LLM judge)

Built-in peerbench benchmarks under `src/benchmarks/peerbench/`:
- MCQ (multiple choice questions)
- QA (question-answer)
- Multi-turn conversation

## SDK 0.2 — Path Aliases

The codebase uses `@/` as a path alias (defined in `tsconfig.json`). All internal imports use `@/` prefix (e.g. `@/providers`, `@/schemas`, `@/types`).

---

## Planning / TODO

Items discussed but not yet implemented.

### Target Abstraction (Provider + Model Separation)

**Status:** Discussed, not implemented.

**Problem:** Providers currently serve dual roles — API client AND callable unit passed to runners. This causes:
1. Mastra provider widens `forward()` signature with provider-specific params (`memory`, `underlyingModel`) at `src/providers/mastra.ts:38-42`, breaking the generic contract
2. `args.model` means different things per provider (model slug in OpenAI, agent ID in Mastra at `mastra.ts:51`)
3. Custom endpoint providers may not have a "model" concept at all
4. Shared resources (rate limiters, caches) get duplicated when creating multiple provider instances for different models
5. Runners must special-case providers if provider-specific params are needed

**Proposed solution:** Split Provider into two concepts:
- **Provider** = API client factory. Holds shared config (apiKey, rateLimiter, cache, endpoint). Produces Target instances via factory methods.
- **Target** = the callable unit the runner receives. Has `forward()` (without `model` param), `slug`, and `providerKind`.

```
Provider (factory, shared config)
  ├── .model("gpt-4o")       → returns Target
  ├── .agent("my-agent", {}) → returns Target
  └── Custom endpoint        → IS a Target directly (implements the interface)
```

**Proposed Target interface:**
```ts
interface Target {
  readonly slug: string          // "gpt-4o", "my-agent", etc.
  readonly providerKind: string  // "peerbench.ai/llm/openai", etc.
  forward(args: { messages, temperature?, responseFormat?, abortSignal? }): Promise<ChatResponse>
}
```

**Key design decisions:**
- `providerKind` is required on Target because the runner populates it in the response object
- `model` is removed from `LLMProviderForwardArgs` — captured at Target construction time
- All provider-specific config (memory, underlyingModel, agentId) is captured at construction, not at `forward()` call time
- Named "Target" (not "Model" or "Agent") because it's neutral — represents "the thing being benchmarked"
- No `providerOptions` escape hatch (unlike Vercel AI SDK) — runners must be fully provider-agnostic

**Prior art:** Vercel AI SDK uses the same provider/model separation. Letta provider wraps stateful agents into the same model interface. See:
- https://ai-sdk.dev/docs/foundations/providers-and-models
- https://ai-sdk.dev/docs/ai-sdk-core/provider-management
- https://github.com/letta-ai/vercel-ai-sdk-provider

**Generalization layers (future):**
1. Programmatic: `openai.model("gpt-4o")` returns Target
2. Config-driven: JSON config object → `createTargets(config)` → Target[]
3. Registry: `TargetRegistry` with provider registration, Zod-validated per-provider config schemas, string-based resolution

**Estimated scope:** ~17 files, mostly mechanical. Breaking change (acceptable for experimental SDK).
