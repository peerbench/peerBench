# Tutorial: Implementing a New Benchmark in `peerbench-v0.2`

This guide walks through adding a new benchmark to `packages/sdk-0.2` end-to-end:

- how the entity schemas relate (`TestCase` ↔ `Response` ↔ `Score`)
- how loaders/runners/scorers/providers fit together at runtime
- how to structure the code so it stays maintainable as benchmarks grow

The examples referenced below are in this repository:

- Basic “single kind + optional scorers”: `packages/sdk-0.2/src/benchmarks/example/basic/`
- Multiple test case kinds in one benchmark: `packages/sdk-0.2/src/benchmarks/example/multi-kind/`
- Multiple scorer implementations: `packages/sdk-0.2/src/benchmarks/example/multi-scorer/`
- Multi-turn, two-LLM benchmark (target + simulated user): `packages/sdk-0.2/src/benchmarks/fnol/`

---

## 0) Mental model: what you are building

### Entities (persistable)

Benchmarks are built out of versioned entities:

- **TestCase**: the input/task definition (what the model is asked to do)
- **Response**: the model output for that test case
- **Score** (optional): an evaluation of that response

They are linked by IDs (not by embedding objects):

- `Response.testCaseId` → `TestCase.id`
- `Score.responseId` → `Response.id`

This ID-based linking makes it easy for host apps to store entities independently (DB, JSONL, object storage) and join them later.

### BenchmarkSpec (optional)

A BenchmarkSpec is an optional persisted config blob that applies to the whole dataset/run.

Good uses:

- prompt wrappers/prefixes/suffixes shared across many cases (A/B test prompt scaffolding)
- benchmark-level templates/blobs referenced by cases
- UI metadata for host apps (labels, notes, constraints)

Avoid:

- storing secrets directly (prefer out-of-band storage + hashes/refs)
- putting per-case fields into the spec (those belong in the test case)

Reference: `packages/sdk-0.2/src/benchmarks/example/basic/spec.ts`

### Runtime components

At runtime, the relationships are:

`TestCase` → (runner formats prompt/messages) → `provider.forward(...)` → `Response` → (optional) `scorer.score(...)` → `Score`

Important boundary rules:

- Providers do backend I/O (HTTP, auth, retries, rate limiting). They should be benchmark-agnostic.
- Runners glue schemas + providers together (prompt formatting, mapping provider response → Response entity).
- Scorers evaluate (algorithmic or judge model). They should not perform prompt formatting for the benchmark.
- Loaders are format adapters (bytes/files/rows → entities).

---

## 1) Create your benchmark folder

Benchmarks live under:

`packages/sdk-0.2/src/benchmarks/<benchmark-name>/`

Recommended structure:

```
src/benchmarks/<name>/
  index.ts
  loader.ts              (optional but common)
  runner.ts              (required)
  scorer.ts              (optional)
  score.ts               (optional “base score” extensions)
  spec.ts                (optional benchmark-level config)
  test-cases/
    <case>.v1.ts
    ...
```

Examples:

- `src/benchmarks/fnol/` includes runner + scorer + loader + base score + test case schemas.
- `src/benchmarks/example/basic/` is the minimal “template”.

---

## 2) Define schemas first (the SDK “source of truth”)

The SDK treats runtime schemas (Zod) as the source of truth; TypeScript types are derived via `z.infer`.

Start by defining the three core schemas:

- `defineTestCaseSchema({ kind, schemaVersion, fields })`
- `defineResponseSchema({ kind, schemaVersion, fields })`
- `defineScoreSchema({ kind, schemaVersion, fields })`

Reference: `packages/sdk-0.2/src/benchmarks/example/basic/test-cases/echo.v1.ts`

### Choosing `kind` and `schemaVersion`

Best practice:

- Use namespaced kinds, e.g. `mybench.ts.taskA`, `mybench.rs.taskA`, `mybench.sc.taskA`.
- Start `schemaVersion` at `1`.
- If you change the persisted shape in a breaking way, increment `schemaVersion` and add a migration strategy (host apps manages the migration process).

### Response schema and provider “ports”

If your benchmark uses chat-style LLM providers:

- Use `BaseLLMChatResponseSchemaV1` as your base response schema (it already has `data`, `modelSlug`, `provider`, token/cost fields).

Reference: `packages/sdk-0.2/src/schemas/llm/response.ts`

If your benchmark is not chat-based (translation, embeddings, etc.), create a new provider “port” (abstract provider type + base response shape) rather than stuffing chat-only fields into generic params.

---

## 3) Implement a loader (bytes → test cases)

Loaders are format adapters. They do not run models.

The loader contract returns:

```ts
{
  testCases: TTestCase[];
  responses: TResponse[];
  scores: TScore[];
  benchmarkSpec?: TBenchmarkSpec;
}
```

Even if you only load test cases, you still return `responses: []` and `scores: []`.

Reference (minimal test-case-only loader):

- `packages/sdk-0.2/src/benchmarks/example/basic/loader.ts`

Reference (JSON/JSONL with multiple kinds):

- `packages/sdk-0.2/src/benchmarks/example/multi-kind/loader.ts`

Reference (multi-format loaders like JSON + Parquet):

- `packages/sdk-0.2/src/benchmarks/mmlu-pro/loader.ts`

Best practices for loaders:

- Validate every item with Zod at the boundary (fail fast).
- Prefer explicit error messages: “Invalid test case at index N”.
- Deduplicate by ID if it makes merges deterministic.
- Keep “mapping” separate from “validation” if your input format is not already in schema shape (e.g. DB columns).

---

## 4) Implement the runner (one test case → response (+ score))

Runners are intentionally single-test-case (“per-case”) in `sdk-0.2`.

Reference (basic pattern):

- `packages/sdk-0.2/src/benchmarks/example/basic/runner.ts`

Reference (multi-kind dispatch):

- `packages/sdk-0.2/src/benchmarks/example/multi-kind/runner.ts`

Reference (multi-turn conversation, two providers):

- `packages/sdk-0.2/src/benchmarks/fnol/runner.ts`

### Typical runner responsibilities

1. Build the provider request (for chat LLMs: `messages[]`).
2. Call `provider.forward(...)`.
3. Map the provider response into a benchmark `Response` entity.
4. Optionally call a scorer and map the result into a benchmark `Score` entity.

### Score “dispatch” patterns

You will see two common patterns:

**A) Runner supports multiple scorer implementations** (recommended for flexibility)

- Dispatch on `scorer.kind`.
- Example: `packages/sdk-0.2/src/benchmarks/example/basic/runner.ts`
- Example: `packages/sdk-0.2/src/benchmarks/example/multi-scorer/runner.ts`

**B) Runner includes deterministic scoring internally** (fine for very simple tasks)

- Useful if scoring is trivial and not configurable.
- Example: `packages/sdk-0.2/src/benchmarks/example/multi-kind/runner.ts`

### JSON output / “structured mode” benchmarks

If your benchmark requires the model to output JSON:

- Instruct the model clearly (“output ONLY JSON”).
- Parse with `parseResponseAsJSON` which uses `jsonrepair` for resilience.
  - Reference: `packages/sdk-0.2/src/utils/llm.ts`
- Define the expected JSON shape in the test case schema (so the deterministic scorer can validate it).

Multi-turn + forced final JSON pattern (important for agent-like benchmarks):

- Reference: `packages/sdk-0.2/src/benchmarks/fnol/runner.ts`

---

## 5) Implement scorers

Scorers should return a normalized result (`BaseScorerResult`) and keep benchmark-specific persistence concerns in the runner.

### Algorithmic scorer

Best when:

- scoring is deterministic
- you want fast, cheap, reproducible evaluation

Examples:

- `packages/sdk-0.2/src/benchmarks/example/basic/scorer.ts` (exact match)
- `packages/sdk-0.2/src/benchmarks/fnol/scorer.ts` (field completeness/correctness)

### LLM judge scorer

Use when:

- evaluation is semantic and hard to encode deterministically
- you can tolerate cost/latency

SDK scorer:

- `LLMJudgeScorer` in `packages/sdk-0.2/src/scorers/llm-judge.ts`

Example usage in a runner:

- `packages/sdk-0.2/src/benchmarks/example/basic/runner.ts`
- `packages/sdk-0.2/src/benchmarks/fnol/runner.ts`

Best practices for LLM judging:

- Keep a stable rubric and include it in metadata/spec when possible.
- Persist judge model + provider + token/cost fields for auditability.
- Treat the judge output as a score entity separate from the response.

---

## 6) Providers: when you need a new backend integration

Benchmarks never call HTTP directly; they use a provider abstraction.

If your host needs a new model backend, implement a new provider by extending `AbstractLLMProvider`.

Reference implementation (no network, good for tests):

- `packages/sdk-0.2/src/providers/example/echo.ts`
- Guide: `packages/sdk-0.2/src/providers/example/README.md`

Production-grade examples:

- `packages/sdk-0.2/src/providers/openai.ts`
- `packages/sdk-0.2/src/providers/openrouter.ts`

Provider best practices:

- handle auth, baseURL, retries, timeouts, rate limiting, and error normalization inside the provider
- return `startedAt`/`completedAt` consistently
- include token/cost accounting when available

---

## 7) Export your benchmark pack (public API)

Add your benchmark pack to:

- `packages/sdk-0.2/src/benchmarks/<name>/index.ts`
- `packages/sdk-0.2/src/benchmarks/index.ts`

Then host apps can import:

`import { <name> } from "peerbench-v0.2/benchmarks";`

Avoid deep imports into `src/...` or `dist/...`. The `package.json` `exports` map should define what is public.

---

## 8) Running / testing locally

### Typecheck

From `packages/sdk-0.2`:

- `npm run lint` (runs `tsc` + eslint)

### Build

From `packages/sdk-0.2`:

- `npm run build`

### Smoke test pattern (recommended)

Even if you don’t add formal unit tests, you can keep a small “dev script” (like `src/dev.ts`) that:

- constructs a test case via `.new(...)`
- calls a provider (or `ExampleEchoLLMProvider` for offline)
- calls your benchmark runner
- logs the response/score JSON

Reference: `packages/sdk-0.2/src/dev.ts`

---

## 9) Common pitfalls

### “Literal `kind` not inferred”

If you see `kind: string` instead of a literal, it typically means the schema builder uses a runtime conditional that widens types. Prefer schema definers that preserve literal types (see `buildSchemaDefiner`), or overload APIs.

### “Empty JS module breaks ESM”

If a file is type-only (`export type ...`) and you re-export it as runtime (`export * from ...`), some app bundlers can misclassify the emitted JS. Prefer `export type { ... }` for type-only exports.

Reference decision: `packages/sdk-0.2/src/index.ts`

---

## 10) When your benchmark grows: patterns that scale

- **Multiple kinds**: keep each kind’s schema in `test-cases/<name>.vN.ts` and dispatch in one runner.
- **Benchmark spec**: use `spec.ts` for knobs you want to share across runs or expose in a UI.
- **Two-model workflows**: pass multiple providers/models in `runConfig` (see FNOL).
- **Hashing/redaction/provenance**: keep it orchestration/persistence-level unless the benchmark requires it.
