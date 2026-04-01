# Agent Memory

## Project Overview

- **peerBench** — monorepo for a benchmarking platform for AI systems
- Published as `peerbench` on npm (v0.0.11), MIT license, ESM only (no CommonJS)
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

### Providers and Callables

The SDK separates **Provider** (API client factory) from **Callable** (callable unit passed to runners).

#### Callable Hierarchy

The SDK uses a two-level Callable hierarchy. Callables are **interfaces** (not classes).

**Base `Callable<TProvider>`** (`src/providers/callables/callable.ts`) — shared root for all callable types:
```ts
interface Callable<TProvider = AbstractProvider> {
  readonly provider: TProvider
}
```

**`CallableLLM<TProvider> extends Callable<TProvider>`** (`src/providers/callables/llm.ts`) — LLM-specific callable, what runners receive:
```ts
interface CallableLLM<TProvider = AbstractProvider> extends Callable<TProvider> {
  slug: string
  forward(args: CallableLLMForwardArgs): Promise<LLMResponse>
}

type CallableLLMForwardArgs = {
  messages: ChatCompletionMessageParam[]
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormatText | ResponseFormatJSONSchema | ResponseFormatJSONObject
  abortSignal?: AbortSignal
}
```

Providers return plain objects satisfying the interface from their factory methods (`.model()`, `.agent()`, etc.) — no separate callable classes needed. All forward logic is inlined as arrow functions within the factory method, capturing state via closures. No private `forward()` methods on providers.

`LLMResponse` type lives in `callables/llm.ts` alongside `CallableLLM`.

Key points:
- No `model` in `forward()` — captured at construction time via closure
- `provider` is generic — defaults to `AbstractProvider`, providers specify their type (e.g. `CallableLLM<OpenAIProvider>`)
- `slug` is required — providers must provide a model/agent identifier
- Runners are fully provider-agnostic — no special-casing per provider
- No callable classes — providers return plain `{ slug, provider, forward }` objects
- Base `Callable` exists as shared root for future non-LLM callable types
- The name "Callable" is neutral — the role (target, judge, selector) is determined by context/parameter naming

#### Provider (Abstract Base)

- `AbstractProvider` (`src/providers/abstract.ts`) — defines `kind` property, `ProviderResponse<TData>` type, and `withKind()` static factory method. This is the **only** abstract class for providers — there is no `AbstractLLMProvider`.

Providers extend `AbstractProvider` directly (usually via `.withKind()`) and define their own factory methods with semantically meaningful names: `.model()` for LLM providers, `.agent()` for agent providers, etc. The SDK does not enforce a specific factory method name — providers are free to name them as they see fit. Each callable stores a reference back to its parent provider via the `provider` field.

**`LLMResponse`:** `ProviderResponse<string> & { inputTokensUsed?, outputTokensUsed?, inputCost?, outputCost?, timeToFirstToken?, metadata? }` (defined in `callables/llm.ts`)

- `timeToFirstToken?: number` — milliseconds from request start to first response token (used by streaming providers like Mastra)
- `metadata?: Record<string, unknown>` — provider-specific metadata

**`withKind()` pattern:** All providers use `AbstractProvider.withKind("kind-string")` to create a typed subclass with a static + instance `kind` property. Scorers use the same pattern via `AbstractScorer.withKind()`.

#### Concrete Providers

- `OpenAIProvider` (kind: `peerbench.ai/llm/openai`) — wraps OpenAI SDK, built-in retry logic, rate limiting
  - `.model({ model })` returns `CallableLLM<OpenAIProvider>` with model baked in
- `OpenRouterProvider` (kind: `peerbench.ai/llm/openrouter.ai`) — fetches and caches model list for 24h, calculates costs via `Decimal.js`
  - `.model({ model })` returns `CallableLLM<OpenRouterProvider>` that wraps OpenAI callable with cost calculation
- `MastraProvider` (kind: `peerbench.ai/llm/mastra`) — wraps Mastra client v1, uses streaming for TTFT measurement, supports agent introspection (`getAgentInfo`, `getAgents`)
  - `.agent({ agentId, memory?, requestContext?, providerOptions? })` returns `CallableLLM<MastraProvider>` with streaming + TTFT tracking
  - Uses `agent.stream()` internally, accumulates text from `text-delta` chunks, captures token usage from `finish` chunk
  - `requestContext` replaces old `runtimeContext` (Mastra v1 rename), imported from `@mastra/core/request-context`
  - `memory` uses `AgentMemoryOption` type from `@mastra/core/agent`
  - `providerOptions` uses `ProviderOptions` type from `@mastra/core/dist/llm/model/provider-options`
  - `getAgents()` method internally calls `client.listAgents()` (v1 API)
  - `CoreMessage` from `@mastra/core/llm` used for message mapping
- `ExampleEchoLLMProvider` (kind: `example.echo`) — echoes last user message (for testing)
  - `.model({ model? })` returns `CallableLLM<ExampleEchoLLMProvider>` for testing
- `ExampleRestApiLLMAgentProvider` (kind: `example.rest-api.agent`) — demonstrates custom REST API integration
  - `.model({ model? })` returns `CallableLLM<ExampleRestApiLLMAgentProvider>` that calls external REST API

Note: Example providers (echo, restapi) are NOT exported from `peerbench/providers`. They live under `src/providers/example/` and are only for reference.

### Runners (function-based, per-test-case)

A runner executes one test case and returns `{ response, score? }`. Orchestration (looping over many test cases) is the runtime's job.

**`defineRunner(fn)`** — wraps a function as a runner, enforcing the structural contract via TypeScript generics:
- Params must include `testCase: BaseTestCaseV1`, `target: Callable`, `scorer?: AbstractScorer`
- The runner author can add any additional params they need (temperature, systemPrompt, idGenerators, etc.)
- Return type must be `{ response: BaseResponseV1, score?: BaseScoreV1 }`
- No config object, no auto-validation, no schema sets — the runner handles everything itself
- The caller gets full type safety based on the runner author's explicit param annotations

**`RunnerParams` type:** base constraint — `{ testCase: BaseTestCaseV1, target: Callable, scorer?: AbstractScorer }`
**`RunnerResult` type:** `{ response: BaseResponseV1, score?: BaseScoreV1 }`

Note: `RunnerParams` uses `target: Callable` (base interface), but concrete runners narrow to `target: CallableLLM` in their param types.

**Built-in peerbench runners (each is 1:1 with a schema set):**
- `mcqRunner` — MCQ test cases, supports MCQScorer + LLMAsAJudgeScorer, system prompts, Handlebars template variables
- `qaRunner` — QA test cases, supports LLMAsAJudgeScorer only, system prompts, Handlebars template variables

### Scorers (class-based)

**Abstract base:** `AbstractScorer` — defines `kind` and `score()` method, uses same `withKind()` pattern as providers.

**`BaseScorerResult`:** `{ value: number, explanation?: string, metadata? }`

**Concrete scorers:**
- `MCQScorer` — regex-based multiple choice answer extraction
- `RegexScorer` — generic regex pattern matching
- `LLMAsAJudgeScorer` (kind: `peerbench.ai/llm-as-a-judge`) — LLM-based evaluation
  - Constructor receives `callable` (a `CallableLLM`) and optional `rateLimiter` — infrastructure config
  - `score()` receives evaluation context: `response`, `rubric`, `criteria`, optional `fieldsToExtract`, `systemPrompt`, `maxExplanationLength`
  - Design rationale: constructor = infrastructure (what model to use), `score()` = evaluation context (what to evaluate). Rubric and criteria are test-case-dependent — each runner builds them dynamically from test case data (e.g. correctAnswerKeys, goodAnswers, badAnswers).
  - Supports weighted criteria with configurable scales
  - Returns normalized `value` in `0..1` range, plus `modelSlug` and `provider` from the callable
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
peerbench/benchmarks   → built-in benchmark runners (mcqRunner, qaRunner, etc.)
peerbench/providers    → abstract + concrete providers (excluding example providers)
peerbench/schemas      → base schemas, schema definers
peerbench/schemas/llm  → system prompt schemas
peerbench/schemas/extensions → ExtensionLLMResponseFieldsV1, ExtensionLLMAsAJudgeScoreFieldsV1
peerbench/scorers      → abstract + concrete scorers
peerbench/storages     → abstract + concrete storages
peerbench/aggregators  → abstract + concrete aggregators
```

`peerbench/providers` exports: `Callable`, `CallableLLM`, `CallableLLMForwardArgs`, `LLMResponse`, `AbstractProvider`, `ProviderResponse`, `MastraProvider`, `OpenAIProvider`, `OpenRouterProvider`

## SDK 0.2 — Key Dependencies

- `zod` v4 (NOT v3)
- `openai` v6 (for types like `ChatCompletionMessageParam`, `ResponseFormat`)
- `@mastra/client-js` v1 (also uses types from `@mastra/core` transitively — `RequestContext`, `AgentMemoryOption`, `ProviderOptions`, `CoreMessage`)
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
- MCQ (multiple choice questions) — `mcq-runner.ts`
- QA (question-answer) — `qa-runner.ts`

Note: The old monolithic `runner.ts` under `src/benchmarks/peerbench/` has been split into `mcq-runner.ts` and `qa-runner.ts`.

## SDK 0.2 — Path Aliases

The codebase uses `@/` as a path alias (defined in `tsconfig.json`). All internal imports use `@/` prefix (e.g. `@/providers`, `@/schemas`, `@/types`).

---

## Usage Example

```ts
import { OpenRouterProvider } from "peerbench/providers";
import { LLMAsAJudgeScorer } from "peerbench/scorers";
import { mcqRunner } from "peerbench/benchmarks";

const provider = new OpenRouterProvider({ apiKey: "..." });

// Create callables from the provider — each provider names its factory method semantically
const target = provider.model({ model: "meta-llama/llama-3.2-3b-instruct:free" });
const judgeCallable = provider.model({ model: "mistralai/mistral-7b-instruct:free" });

// Scorer receives a callable, not provider + model
const scorer = new LLMAsAJudgeScorer({ callable: judgeCallable });

// Each runner is 1:1 with a schema set — params are flat (no runConfig nesting)
const result = await mcqRunner({
  testCase,
  target,
  scorer,
  systemPrompt,
});
```

## Design Decisions Log

- **Target → Callable rename (Jan 2026):** "Target" was semantically wrong for judge/selector LLMs — those aren't the "target" of benchmarking. "Callable" is a neutral name; the role (target, judge, selector) is determined by context/parameter naming, not by type.
- **Interfaces for Callables (Jan 2026):** With the simplified `defineRunner`, classes are no longer needed as runtime values. Switched from `abstract class AbstractCallableLLM` to `interface CallableLLM<TProvider = AbstractProvider>`. Providers return plain objects from factory methods — no separate callable classes. Generic `TProvider` defaults to `AbstractProvider` so consumers don't need to specify it.
- **Provider reference instead of string:** `callable.provider` holds a reference to the actual `AbstractProvider` instance, not a kind string. Access kind via `callable.provider.kind`.
- **defineRunner simplification (Jan 2026):** Removed config object (callables, schemaSets, scorers, runConfigSchema, defaults). `defineRunner(fn)` now only enforces the structural contract: params must have `testCase + target (Callable) + scorer?`, return must be `{ response, score? }`. Runner authors explicitly type their params and handle their own validation/defaults.
- **Runner ↔ schema set 1:1 (Jan 2026):** Split monolithic `peerbenchRunner` into `mcqRunner` and `qaRunner`. Each runner handles exactly one test case type. No union types or runtime `kind` discrimination in runners. Eliminates dead code paths and makes scorer types precise (e.g. `qaRunner` only accepts `LLMAsAJudgeScorer`).
- **Remove AbstractLLMProvider, semantic factory names (Jan 2026):** Removed `AbstractLLMProvider` — providers extend `AbstractProvider` directly. Factory methods are no longer forced by an abstract method. Instead, each provider names its factory semantically: `.model()` for LLM-model providers (OpenAI, OpenRouter, Echo, RestApi), `.agent()` for agent providers (Mastra). `LLMResponse` type lives in `callables/llm.ts`. All factory methods have explicit return types (e.g. `CallableLLM<OpenAIProvider>`). All forward logic is inlined as arrow functions within factory methods — no private `forward()` methods on providers.
- **ChatResponse → LLMResponse rename (Jan 2026):** `ChatResponse` was renamed to `LLMResponse` for clarity. The type is `ProviderResponse<string>` extended with token usage, cost, TTFT, and metadata fields.
- **Mastra v1 streaming + TTFT (Jan 2026):** Updated `MastraProvider` for `@mastra/client-js` v1. Uses `agent.stream()` instead of `agent.generate()` to measure Time To First Token (TTFT). `runtimeContext` → `requestContext` (v1 rename). `getAgents()` method internally calls `client.listAgents()` (v1 rename). `timeToFirstToken` added to `LLMResponse` as a generic field all providers can use. Added `providerOptions` param to `.agent()` for passing through Mastra provider options.
- **LLM Judge Scorer design (Jan 2026):** Constructor holds infrastructure config (`callable`, `rateLimiter`). `score()` receives evaluation context (`response`, `rubric`, `criteria`, `fieldsToExtract`). This split exists because rubric and criteria are test-case-dependent — each runner builds them dynamically from test case data. For example, MCQ runner builds rubric from `correctAnswerKeys` and `options`, QA runner builds rubric from `goodAnswers` and `badAnswers`.
