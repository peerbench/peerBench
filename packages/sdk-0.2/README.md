# `peerbench-v0.2` SDK

This package is the reusable “domain core” for working with AI benchmark data and running evaluations.

Host applications (CLI/web/workers) should *compose* the SDK; they shouldn’t re-define core entity schemas or re-implement benchmark logic unless they’re intentionally creating a custom benchmark plugin.

## What the SDK is for

- **Source of truth for data shapes**: runtime-validated schemas (Zod) + TypeScript types for persisted entities.
- **Portable benchmark implementations**: loaders + runners + scorers that behave the same across hosts.
- **Provider/scorer contracts**: standard interfaces so benchmarks can run against different model backends.
- **Shared utilities**: ID helpers, JSON parsing helpers, rate limiting, etc.

## Core concepts

### Entities (persistable)

All entity types are versioned and identified with `kind` + `schemaVersion`.

- **BenchmarkSpec**: optional benchmark-level config shipped alongside data (e.g. prompt blobs, runner knobs).
- **TestCase**: one evaluation input/task.
- **Response**: the model output for a specific test case (`testCaseId` links to `TestCase.id`).
- **Score**: evaluation output for a specific response (`responseId` links to `Response.id`).

### Loader

A loader reads external data (JSON/JSONL/Parquet/DB/etc.) and returns in-memory entities:

`{ testCases: TestCase[], responses: Response[], scores: Score[], benchmarkSpec?: BenchmarkSpec }`

In `sdk-0.2` you’ll see both:
- simple loaders that parse one format directly
- generic loaders that provide reusable “array → entities” logic

### Provider

A provider is the runtime bridge to a model endpoint.

Today the SDK focuses on chat-style LLM providers (`AbstractLLMProvider`), but the same pattern can be extended to other “ports” later (translation, embeddings, rerankers).

### Runner (single test case)

A runner executes **one** test case and returns a single `{ response, score? }`.

Running *many* test cases (parallelism, retries, persistence, aggregation) is intentionally kept out of the runner and belongs to the host app (an “orchestrator” / `runBatch`).

### Scorer

A scorer evaluates a response (often using the test case as context) and produces a normalized result that the runner maps into a `Score` entity.

Scorers can be:
- algorithmic (fast, deterministic)
- LLM-judge based (slower, but flexible)

## Built-in benchmarks

Import benchmark packs via:

- `import { peerbench, mmluPro, example } from "peerbench-v0.2/benchmarks";`

Each benchmark pack typically exports:
- test case / response / score schemas
- one or more loaders
- a `runCase`/`runTestCase` function
- optional scorer(s)

## Quick start (run one test case)

```ts
import { OpenRouterProvider } from "peerbench-v0.2";
import { example } from "peerbench-v0.2/benchmarks";

const provider = new OpenRouterProvider({ apiKey: process.env.API_KEY! });
const scorer = new example.ExampleExactMatchScorer();

const result = await example.runTestCase({
  testCase: example.ExampleEchoTestCaseSchemaV1.new({
    id: "tc-1",
    instruction: "Repeat the input exactly",
    input: "hello",
    expectedOutput: "hello",
  }),
  provider,
  scorer,
  runConfig: { model: "mistralai/ministral-8b" },
});
```

## Quick start (load test cases)

```ts
import { example } from "peerbench-v0.2/benchmarks";

const loader = new example.ExampleJSONDataLoader();
const { testCases } = await loader.loadData({
  content: new TextEncoder().encode('[{"id":"tc-1","kind":"example.ts.echo","schemaVersion":1,"instruction":"Repeat","input":"hi","expectedOutput":"hi"}]'),
});
```

## Implementing a new benchmark (recommended steps)

1. **Define schemas** (Zod + inferred types)
   - `defineTestCaseSchema({ kind, schemaVersion, fields })`
   - `defineResponseSchema({ kind, schemaVersion, fields })`
   - `defineScoreSchema({ kind, schemaVersion, fields })`
2. **Write a loader** that maps your input data format into `TestCase[]` (and optionally `Response[]`/`Score[]`).
3. **Implement the runner** (`runCase`)
   - format prompt/messages
   - call the provider
   - build a `Response`
   - optionally score and build a `Score`
4. **Export the benchmark pack** from `src/benchmarks/<your-benchmark>/index.ts` and `src/benchmarks/index.ts`.

Use `src/benchmarks/example/` as the reference implementation.

## Design notes (why things look like this)

- **Schemas are the source of truth**: runtime validation prevents “type-only” drift.
- **Per-test-case runner**: keeps runner logic small and composable; hosts can implement their own orchestration strategy.
- **ESM-only**: simplifies exports and bundling; avoid deep imports and rely on the `exports` map.
- **Type-only exports**: prefer `export type { ... }` for type-only modules to avoid app bundlers tripping over “empty JS” modules.

## Extension possibilities

- Standardize a `runBatch`/`BatchRunner` abstraction (concurrency, retries, checkpointing, persistence hooks).
- Add additional provider “ports” beyond chat LLMs (translation, embeddings, reranking).
- Add optional provenance: canonical hashing, redaction hooks, content-addressed IDs.
