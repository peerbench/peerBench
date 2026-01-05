# `peerbench` SDK

This package is the shared “domain core” for _building benchmarks_ in a standardized, portable way. It gives you a consistent set of _persistable entities_ (schemas + types), and a consistent set of _runtime contracts_ (loaders, runners, scorers, providers) so the same benchmark can run in a CLI, a web app, a worker, or anything else.

> _Runtime_ refers to the codebase (a CLI, a webapp, a background service etc.) that uses the SDK.

If you’re implementing a new benchmark, the SDK is the part that keeps it portable instead of glued to one runtime. If you’re integrating Peerbench into a runtime, the SDK is the part you don’t want to rewrite in every repo.

> This package does not support CommonJS

## What is a benchmark?

A benchmark is a structured way to ask: “How well does a system perform on a set of tasks, under a set of rules?”

If you look at widely-used benchmarks, the pattern is always the same even when the tasks are different:

- In MMLU-Pro, each item is a question (often multiple choice) and the score is about correctness across categories.
- In BIG-bench style task suites, you have many different task types and you want a consistent way to run and score them.
- In HELM-style evaluations, you care about not only “did it answer correctly”, but also how you ran it (prompting setup, constraints, metadata) and how you report results.

Those benchmarks differ in details, but they all boil down to the same building blocks: a dataset of test cases, a way to run a system on each test case, and a way to score the output. The Peerbench SDK is designed so these patterns can be represented with the same portable shape.

## The mental model

Now that we agree on what a benchmark is, we can talk about how Peerbench represents it.

Peerbench is deliberately boring here. It doesn’t try to invent a new “benchmark framework”. It gives you a small set of building blocks that you can compose. If you understand these pieces, you can read any benchmark implementation and know where to look.

### Entities (the things you store)

When you run an evaluation, you end up with data that you want to store, query, re-score, and share. Peerbench standardizes that output by modeling it as a small set of entities.

This SDK assumes four core entities:

- `BenchmarkSpec`: optional benchmark-level configuration (think: “applies to the whole dataset/run”).
- `TestCase`: a single input/task.
- `Response`: the model output for a specific test case (`testCaseId` points to `TestCase.id`).
- `Score`: an evaluation result for a specific response (`responseId` points to `Response.id`).

Everything else in the SDK exists to create these entities in a predictable way.

Two fields show up everywhere:

- `kind` tells you _what type_ of entity something is. It is a stable string you pick (descriptive).
- `schemaVersion` tells you _which version_ of that entity shape you’re looking at.

This is why Peerbench leans on [Zod](https://zod.dev) schemas: it keeps the persisted data contract explicit and runtime-validated.

### Loader (how raw data becomes test cases)

In real projects, test cases live in many places: JSON files, JSONL streams, a database, Parquet, an API, etc.

A loader is the piece that reads that raw data and returns `TestCase[]` (and optionally existing `Response[]` / `Score[]`). The important point is not the file format. The important point is that the loader is where your “raw input → Peerbench entities” mapping lives.

### Provider (how you talk to a model)

A provider is the runtime bridge to a model endpoint.

Runners do not talk to models directly. They call a provider abstraction (today that’s `AbstractLLMProvider` for message-based LLM communication). That gives you a clean seam:

- benchmark code doesn’t care where the model lives
- runtimes can swap providers without rewriting benchmark code

If you already have your own service in front of the model, you can still model it as a provider. The example in `packages/sdk-0.2/src/providers/example/restapi.ts` shows this pattern.

### Runner (how you execute one test case)

A runner is the execution part of a benchmark. A runner function takes whatever inputs it needs, calls a provider, and produces a `Response`. It may also produce a `Score` (directly, or via a scorer).

Runners are indented to be “per test case” because it keeps the benchmark logic small and easy to compose. Running a whole dataset is orchestration, and orchestration is where runtimes differ (parallelism, retries, persistence, budgets, progress UI).

There is no restriction that a benchmark must have exactly one runner. You can export multiple runner functions (different modes, different prompts, different providers, different scoring strategies). The runtime just needs to pick the runner it wants to use.

One practical convention you will see in the examples is `runConfig`. It’s runner-specific, and it’s usually kept as a simple JSON-serializable object so you can store it alongside your run and reproduce it later. This is a best practice, not a hard restriction: if something doesn’t belong in `runConfig`, you can pass it as a normal parameter next to it.

### Scorer (how you judge a response)

A scorer produces a numeric result. Some scorers are deterministic (same input → same output). Some scorers are non-deterministic (for example "LLM as a judge").

A scorer takes what it needs. Sometimes it’s “expected + actual strings”. Sometimes it’s “a list of required fields + a JSON output”. The runner decides what to pass into the scorer, because the runner is the piece that knows how the benchmark is structured.

If your benchmark can be scored in multiple ways, a runner can accept multiple scorer implementations and choose between them based on `scorer.kind`. The examples in `packages/sdk-0.2/src/benchmarks/example/` show what that looks like in code.

## What the SDK does vs what the runtime does

It’s easy to accidentally push “too much responsibility” to the SDK and end up with a framework you can’t escape. It’s also easy to push “too much responsibility” to the runtime and end up with copy-pasted benchmark logic.

This SDK tries to draw a clean line:

The SDK is responsible for:

- defining and validating entity shapes (Zod schemas are the source of truth)
- providing base contracts and reusable building blocks (schemas + loaders + runners + scorers)
- defining provider/scorer contracts so you can swap backends without rewriting benchmarks

The runtime is responsible for:

- orchestration across many test cases (parallelism, retries, persistence, resuming, progress UI)
- deciding how/where entities are stored (DB schema, file layout, caching)
- secrets and private content (API keys, redacted prompts, access control)
- version migration strategies when `schemaVersion` changes

If you keep that boundary, benchmarks stay portable and runtimes stay free to evolve.

## If you’re implementing a benchmark

The easiest way to think about “implementing a benchmark” is: you are implementing a small domain module that can be imported by multiple runtimes. That means your job is mostly about making your benchmark _self-contained and explicit_.

In practice, the benchmark implementer is responsible for:

- choosing stable `kind` strings (namespaced, descriptive) and bumping `schemaVersion` on breaking changes
- defining the schemas that are safe to store and share (and keeping secrets out of them)
- deciding how raw datasets map into `TestCase` entities (loader)
- deciding how a test case is executed (runner) and how it becomes a `Response`
- deciding how scoring works (inline in runner, a separate scorer, or multiple scorers)

Once those are in place, runtimes can focus on orchestration and product concerns without rewriting the benchmark logic.

Peerbench does not assume your new benchmarks will be part of the SDK itself. The normal expectation is that your benchmark code lives in your runtime (or in its own package), and it uses `peerbench` as a dependency for schemas, base types, and contracts.

Benchmarks can implement everything themselves, but they can also reuse the SDK’s predefined building blocks. If it is possible, it is recommended to stick with SDK base types (e.g `AbstractLLMProvider`) and implementations, because it increases compatibility with other tooling that speaks “Peerbench entities”.

## A benchmark, step by step

A “benchmark” in this SDK is not a magical object. It is a small folder that exports a few well-known pieces. The simplest complete benchmark usually includes:

1. schemas (test case / response / score)
2. a loader (how test cases are read from disk/DB/etc.)
3. a runner (how a single test case is executed)
4. one or more scorers (optional)

You can see a compact, end-to-end reference in:

- `packages/sdk-0.2/src/benchmarks/example/basic/`

### 1) Schemas: the source of truth

Schemas are the core of a benchmark. They are the entities that hold the data.

In `packages/sdk-0.2/src/benchmarks/example/basic/test-cases/echo.v1.ts` you can see the pattern:

- define a test case schema (`kind` + `schemaVersion` + benchmark fields)
- define a response schema for that test case
- define a score schema for that response

The hierarchy starts from test case → response → score, and we keep the relationship by storing IDs (`testCaseId`, `responseId`). That relationship is “real data”, so the runtime is usually the one that persists it and queries it.

Here is what “defining a test case schema” looks like in practice (trimmed to the idea):

```ts
import { z } from "zod";
import { BaseTestCaseSchemaV1, defineTestCaseSchema } from "peerbench/schemas";

export const MyTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "mybench.ts.someTask",
  schemaVersion: 1,
  fields: {
    prompt: z.string(),
  },
});
```

### 2) Loader: how test cases become entities

A loader reads external data and returns in-memory entities:

```ts
type LoaderResult<TTestCase> = {
  testCases: TTestCase[];
  responses: [];
  scores: [];
};
```

In the basic example (`packages/sdk-0.2/src/benchmarks/example/basic/loader.ts`) the loader reads a JSON array and maps it into `TestCase` entities.

### 3) Provider: how runners talk to models

Runners communicate with models through a provider implementation. That’s how the same benchmark can run against different backends without rewriting the benchmark.

There are also example providers meant to be read as reference implementations:

- `packages/sdk-0.2/src/providers/example/echo.ts` (no network calls; returns deterministic content)
- `packages/sdk-0.2/src/providers/example/restapi.ts` (calls your own REST “agent service”)

If you already have a service in front of your model, the REST API provider example shows the pattern: accept the SDK’s `messages + model` input, translate it to an HTTP request, and translate the HTTP response back into a single string. Nothing else is required.

### 4) Runner: run one test case

A runner function typically executes one test case and returns `{ response, score? }`.

This is intentional. Running many test cases is orchestration, and orchestration is where runtimes differ the most (parallelism, retries, persistence, resuming, UI, cost limits). The runner is the small, portable unit.

In the basic example runner (`packages/sdk-0.2/src/benchmarks/example/basic/runner.ts`) you can see the responsibilities:

- format a test case into provider-friendly input (for chat models, `messages[]`)
- call `provider.forward(...)`
- map provider output into a `Response` entity
- if a scorer is provided, turn scorer output into a `Score` entity

Here is the idea in a minimal form:

```ts
const providerResponse = await provider.forward({ model, messages });

const response = ResponseSchemaV1.new({
  id: "runtime-generates-id",
  testCaseId: testCase.id,
  data: providerResponse.data,
  startedAt: providerResponse.startedAt,
  completedAt: providerResponse.completedAt,
  modelSlug: model,
  provider: provider.kind,
});
```

### 5) Scorers: optional, but powerful

Some benchmarks are easy to score deterministically (string match, regex extraction, set coverage). Some benchmarks need semantic judgment. Some benchmarks want both.

That’s why scorers are separate objects and why runners can accept more than one scorer implementation.

The examples show:

- a deterministic scorer (`packages/sdk-0.2/src/benchmarks/example/basic/scorer.ts`)
- a non-deterministic scorer (`packages/sdk-0.2/src/scorers/llm-judge.ts`)
- a runner that can switch based on `scorer.kind` (`packages/sdk-0.2/src/benchmarks/example/basic/runner.ts`)

## Usage: run a single test case end-to-end

First, pick a benchmark and a provider:

```ts
import { example } from "peerbench/benchmarks";
import { ExampleEchoLLMProvider } from "peerbench/providers";

const provider = new ExampleEchoLLMProvider();
```

Then build a test case entity and run it:

```ts
const testCase = example.ExampleEchoTestCaseSchemaV1.new({
  id: "tc-1",
  instruction: "Repeat the input exactly",
  input: "hello",
  expectedOutput: "hello",
});

const scorer = new example.ExampleExactMatchScorer();

const { response, score } = await example.runTestCase({
  testCase,
  provider,
  scorer,
  runConfig: { model: "example-model" },
});
```

If you want to load test cases instead of constructing them manually, use the loader:

```ts
const loader = new example.ExampleJSONDataLoader();
const { testCases } = await loader.loadData({
  content: new TextEncoder().encode(
    JSON.stringify([
      {
        id: "tc-1",
        kind: "example.ts.echo",
        schemaVersion: 1,
        instruction: "Repeat the input exactly",
        input: "hello",
        expectedOutput: "hello",
      },
    ])
  ),
});
```

## Usage: what the runtime adds (orchestration)

Once you have `runTestCase(...)`, the runtime’s job is mostly about repetition and persistence.

For example, a very small orchestrator might do:

```ts
for (const testCase of testCases) {
  const result = await example.runTestCase({ testCase, provider, runConfig });
  // store `result.response` and `result.score` somewhere durable
  // decide how to handle errors, retries, progress, and budgets
}
```

That loop is where your product decisions live. The SDK is intentionally not opinionated about it.

## More examples to read

The `example` benchmark is split into folders that each teach one idea:

- `packages/sdk-0.2/src/benchmarks/example/basic/`: the simplest complete example
- `packages/sdk-0.2/src/benchmarks/example/multi-kind/`: one runner, multiple test case kinds
- `packages/sdk-0.2/src/benchmarks/example/multi-scorer/`: one runner, multiple scorer implementations

## Design notes

- Schemas are runtime-validated (Zod) so “type-only drift” doesn’t silently corrupt stored data.
- Runners are per-test-case so they stay small and portable; runtimes keep orchestration control.
- Kinds are namespaced strings (e.g. `example.ts.echo`) to avoid collisions across benchmarks.
