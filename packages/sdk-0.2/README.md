# `peerbench` SDK

This package is the shared "domain core" for _building benchmarks_ in a standardized, portable way. It gives you a consistent set of _persistable entities_ (schemas + types), and a consistent set of _runtime contracts_ (runners, scorers, providers, storages, aggregators) so the same benchmark can run in a CLI, a web app, a worker, or anything else.

If you're implementing a new benchmark, the SDK is the part that keeps it portable instead of glued to one runtime. If you're integrating peerbench SDK into a runtime, the SDK is the part you don't want to rewrite in every repo.

> - _Runtime_ refers to the codebase that uses peerbench SDK (a CLI, a webapp, a background service etc.)
> - This package does not support CommonJS

## What is a benchmark?

A benchmark is a structured way to ask: "How well does a system perform on a set of tasks, under a set of rules?"

If you look at widely-used benchmarks, the pattern is always the same even when the tasks are different:

- In MMLU-Pro, each item is a question (often multiple choice) and the score is about correctness across categories.
- In BIG-bench style task suites, you have many different task types and you want a consistent way to run and score them.
- In HELM-style evaluations, you care about not only "did it answer correctly", but also how you ran it (prompting setup, constraints, metadata) and how you report results.

Those benchmarks differ in details, but they all boil down to the same building blocks: a dataset of test cases, a way to run a system on each test case, and a way to score the output. The peerbench SDK is designed so these patterns can be represented with the same portable shape.

## The mental model

Now that we agree on what a benchmark is, we can talk about how peerbench represents it.

peerbench is deliberately boring here. It doesn't try to invent a new "benchmark framework". It gives you a small set of building blocks that you can compose. If you understand these pieces, you can read any benchmark implementation and know where to look.

### Entities (the things you store)

When you run an evaluation, you end up with data that you want to store, query, re-score, and share. peerbench standardizes that output by modeling it as a small set of entities.

This SDK assumes three core entities:

- `TestCase`: a single input/task.
- `Response`: the model output for a specific test case (`testCaseId` points to `TestCase.id`).
- `Score` (optional): an evaluation result for a specific response (`responseId` points to `Response.id`).

Everything else in the SDK exists to create these entities in a predictable way.

Three fields show up everywhere:

- `kind` tells you _what type_ of entity something is. It is a stable string you pick (descriptive).
- `schemaVersion` tells you _which version_ of that entity shape you're looking at.
- `namespace` tells you which "owner" defines that kind (e.g peerbench.ai).

This is why peerbench leans on [Zod](https://zod.dev) schemas: it keeps the persisted data contract explicit and runtime-validated.

### Storage (how entities are persisted)

The SDK does not prescribe how you ingest datasets. Runtimes often load test cases from JSON/JSONL, DB rows, Parquet, or an API. Storages are the abstractions that allow you to standardize the way you load the data from a source to the memory.

peerbench SDK provides some pre-defined storage abstractions you can use out of the box:

- file-based storage with custom codecs (`FileStorage`)
- JSON array files (`JSONFileStorage`)
- SQLite storage (codec-based)

### Provider (how you talk to a model)

A provider is the runtime bridge to a model endpoint. It's an API client factory that creates **callables** — lightweight objects that have the model/agent configuration baked in and can be invoked by runners.

Runners do not talk to providers directly. They receive a **callable** (today that's `CallableLLM` for message-based LLM communication). That gives you a clean seam:

- benchmark code doesn't care where the model lives
- runtimes can swap providers without rewriting benchmark code

Each provider extends `AbstractProvider`. Provider classes have the custom logic to interact with a 3rd party service. They are expected to have a factory method such as `.model()` or `.agent()` that returns a callable unit for their infrastructure. Callable units are what runners receive — they provide a uniform interface so runners don't need any special treatment for the underlying provider implementation.

If you already have your own service in front of the model, you can still model it as a provider. The example in `packages/sdk-0.2/src/providers/example/restapi.ts` shows this pattern.

### Runner (how you execute one test case)

A runner is the execution part of a benchmark. A runner function takes whatever inputs it needs, calls a callable's `forward()`, and produces a `Response`. It may also produce a `Score` (via a scorer).

Runners are intended to be "per test case" because it keeps the benchmark logic small and easy to compose. Running a whole dataset is orchestration, and orchestration is where runtimes differ (parallelism, retries, persistence, budgets, progress UI).

There is no restriction that a benchmark must have exactly one runner. You can export multiple runner functions (different modes, different prompts, different providers, different scoring strategies). The runtime just needs to pick the runner it wants to use.

### Scorer (how you judge a response)

A scorer produces a numeric result. Some scorers are deterministic (same input → same output). Some scorers are non-deterministic (for example "LLM as a judge").

A scorer takes what it needs. Sometimes it's "expected + actual strings". Sometimes it's "a list of required fields + a JSON output". The runner decides what to pass into the scorer, because the runner is the piece that knows how the benchmark is structured.

If your benchmark can be scored in multiple ways, a runner can accept multiple scorer implementations and choose between them. The examples in `packages/sdk-0.2/src/benchmarks/examples/` show what that looks like in code.

## What the SDK does vs what the runtime does

It's easy to accidentally push "too much responsibility" to the SDK and end up with a framework you can't escape. It's also easy to push "too much responsibility" to the runtime and end up with copy-pasted benchmark logic.

This SDK tries to draw a clean line:

It is responsible for:

- defining and validating entity shapes (Zod schemas are the source of truth)
- providing base contracts and reusable building blocks (schemas + runners + scorers + storages + aggregators)
- defining provider/scorer contracts so you can swap backends without rewriting benchmarks

The runtime is responsible for:

- sourcing test cases (JSON/DB/Parquet/API/etc.) and mapping them into `TestCase` entities
- orchestration across many test cases (parallelism, retries, persistence, resuming, progress UI)
- deciding how/where entities are stored (DB schema, file layout, caching)
- secrets and private content (API keys, redacted prompts, access control)
- version migration strategies when `schemaVersion` changes

If you keep that boundary, benchmarks stay portable and runtimes stay free to evolve.

## If you're implementing a benchmark

The easiest way to think about "implementing a benchmark" is: you are implementing a small domain module that can be imported by multiple runtimes. That means your job is mostly about making your benchmark _self-contained and explicit_.

In practice, the benchmark implementer is responsible for:

- choosing stable `kind` strings (namespaced, descriptive) and bumping `schemaVersion` on breaking changes
- defining the schemas that are safe to store and share (and keeping secrets out of them)
- deciding how a test case is executed (runner) and how it becomes a `Response`
- deciding how scoring works (inline in runner, a separate scorer, or multiple scorers)

Once those are in place, runtimes can focus on orchestration and product concerns without rewriting the benchmark logic.

Peerbench does not assume your new benchmarks will be part of the SDK itself. The normal expectation is that your benchmark code lives in your runtime (or in its own package), and it uses `peerbench` as a dependency for schemas, base types, and contracts.

Benchmarks can implement everything themselves, but they can also reuse the SDK's predefined building blocks. If it is possible, it is recommended to stick with SDK base types (e.g `AbstractProvider`, `CallableLLM`) and implementations, because it increases compatibility with other tooling that speaks "Peerbench entities".

## A benchmark, step by step

A "benchmark" in this SDK is not a magical object. It is a small folder that exports a few well-known pieces. The simplest complete benchmark usually includes:

1. schemas (test case / response / score)
2. a runner (how a single test case is executed)
3. one or more scorers (if the SDK provided scorers do not work)
4. (optional) one or more storages (how entities are persisted)

You can see a compact, end-to-end reference in:

- `packages/sdk-0.2/src/benchmarks/examples/echo-basic/`
- `packages/sdk-0.2/src/benchmarks/examples/text-transform/`
- `packages/sdk-0.2/src/benchmarks/examples/exact-match-scorer/`

### 1) Schemas: the source of truth

Schemas are the core of a benchmark. They are the entities that hold the data.

In `packages/sdk-0.2/src/benchmarks/examples/echo-basic/schema-sets/echo.v1.ts` you can see the pattern:

- define a test case schema (`kind` + `schemaVersion` + benchmark fields)
- define a response schema for that test case
- define a score schema for that response

The hierarchy starts from test case → response → score, and we keep the relationship by storing IDs (`testCaseId`, `responseId`). That relationship is "real data", so the runtime is usually the one that persists it and queries it.

Here is what "defining a test case schema" looks like in practice (trimmed to the idea):

```ts
import { z } from "zod";
import { BaseTestCaseSchemaV1, defineTestCaseSchema } from "peerbench/schemas";

export const MyTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: "example.peerbench.ai",
  kind: "llm/my-benchmark",
  schemaVersion: 1,
  fields: {
    prompt: z.string(),
  },
});
```

### 2) Provider: how runners talk to models

Runners communicate with models through a callable created by a provider. That's how the same benchmark can run against different backends without rewriting the benchmark.

A provider is an API client factory. You create a provider once (with API keys, rate limiters, etc.), then call its factory method to create callables — lightweight objects with a `forward()` method and the model baked in:

```ts
import { OpenRouterProvider } from "peerbench/providers";

const provider = new OpenRouterProvider({ apiKey: "..." });
const target = provider.model({ model: "gpt-4o" });

// target.slug === "gpt-4o"
// target.provider.kind === "peerbench.ai/llm/openrouter.ai"
// target.forward({ messages }) — model is already captured
```

If you already have a service in front of your model, the REST API provider example (`src/providers/example/restapi.ts`) shows the pattern: extend `AbstractProvider`, implement a factory method that returns a `CallableLLM`, and translate messages to HTTP requests inside the `forward()` arrow function.

### 3) Runner: run one test case

A runner function typically executes one test case and returns `{ response, score? }`.

This is intentional. Running many test cases is orchestration, and orchestration is where runtimes differ the most (parallelism, retries, persistence, resuming, UI, cost limits). The runner is the small, portable unit.

In the example runners (e.g. `packages/sdk-0.2/src/benchmarks/examples/echo-basic/runner.ts`) you can see the responsibilities:

- format a test case into callable-friendly input (`messages[]`)
- call `target.forward({ messages })`
- map the output into a `Response` entity
- if a scorer is provided, turn scorer output into a `Score` entity

Here is the idea in a minimal form:

```ts
const providerResponse = await target.forward({ messages });

const response = ResponseSchemaV1.new({
  id: "runtime-generates-id",
  testCaseId: testCase.id,
  data: providerResponse.data,
  startedAt: providerResponse.startedAt,
  completedAt: providerResponse.completedAt,
  modelSlug: target.slug,
  provider: target.provider.kind,
});
```

### 5) Scorers

Some benchmarks are easy to score deterministically (string match, regex extraction, set coverage). Some benchmarks need semantic judgment. Some benchmarks want both.

That's why scorers are separate objects and why runners can accept more than one scorer implementation.

The examples show:

- deterministic scoring inside a runner (`packages/sdk-0.2/src/benchmarks/examples/text-transform/runner.ts`)
- multi-scorer dispatch (`packages/sdk-0.2/src/benchmarks/examples/exact-match-scorer/runner.ts`)
- `MCQScorer` and `LLMAsAJudgeScorer` in `peerbench/scorers`

`LLMAsAJudgeScorer` returns a normalized `value` in the `0..1` range (inclusive).

## Usage: run a single test case end-to-end

First, define schemas and a runner (this is the "portable benchmark code"):

```ts
import { defineRunner, idGeneratorUUIDv7 } from "peerbench";
import { CallableLLM } from "peerbench/providers";
import {
  BaseResponseSchemaV1,
  BaseScoreSchemaV1,
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "peerbench/schemas";
import { ExtensionLLMResponseFieldsV1 } from "peerbench/schemas/extensions";
import z from "zod";

const Namespace = "example.peerbench.ai" as const;
const Kind = "llm/echo-basic" as const;

const TestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: Namespace,
  kind: Kind,
  schemaVersion: 1,
  fields: { input: z.string() },
});

const ResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: Namespace,
  kind: Kind,
  schemaVersion: 1,
  fields: { ...ExtensionLLMResponseFieldsV1 },
});

const ScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: Namespace,
  kind: Kind,
  schemaVersion: 1,
  fields: {},
});

type TestCaseV1 = z.infer<typeof TestCaseSchemaV1.schema>;

export const runner = defineRunner(
  async (params: {
    testCase: TestCaseV1;
    target: CallableLLM;
    idGenerators?: {
      response?: (input: unknown) => string;
    };
  }) => {
    const { testCase, target } = params;

    const providerResponse = await target.forward({
      messages: [{ role: "user", content: `Echo:\n${testCase.input}` }],
    });

    const response = await ResponseSchemaV1.newWithId(
      {
        data: providerResponse.data,
        startedAt: providerResponse.startedAt,
        completedAt: providerResponse.completedAt,
        testCaseId: testCase.id,
        modelSlug: target.slug,
        provider: target.provider.kind,
        inputTokensUsed: providerResponse.inputTokensUsed,
        outputTokensUsed: providerResponse.outputTokensUsed,
        inputCost: providerResponse.inputCost,
        outputCost: providerResponse.outputCost,
      },
      params.idGenerators?.response ?? idGeneratorUUIDv7
    );

    return { response };
  }
);
```

## Usage: what the runtime adds (orchestration)

Once you have a runner, the runtime's job is mostly about repetition and persistence.

For example, a very small orchestrator might do:

```ts
import { OpenRouterProvider } from "peerbench/providers";

const provider = new OpenRouterProvider({ apiKey: "..." });
const target = provider.model({ model: "gpt-4o" });

for (const testCase of testCases) {
  const result = await runner({ testCase, target });
  // store `result.response` and `result.score` somewhere durable
  // decide how to handle errors, retries, progress, and budgets
}
```

That loop is where your product decisions live. The SDK is intentionally not opinionated about it.

## More examples to read

The examples under `packages/sdk-0.2/src/benchmarks/examples/` each teach one idea:

- `echo-basic`: minimal schema set + runner + storage examples
- `text-transform`: one runner supports multiple kinds + deterministic scoring
- `exact-match-scorer`: scorer dispatch pattern (algo scorer vs LLM judge scorer)

## Design notes

- Schemas are runtime-validated (Zod) so "type-only drift" doesn't silently corrupt stored data.
- Runners are per-test-case so they stay small and portable; runtimes keep orchestration control.
