# SPEC HISTORY

This file records key design questions and answers (Q&A) for the SDK so decisions don't disappear in chat history.

## Current Architecture Snapshot (code as of 2025-12-30)

- **Entities are plain JSON objects** validated by Zod schemas under `src/schemas/`:
  - `src/schemas/test-case.ts` (`BaseTestCaseSchema`, `defineTestCaseSchema`)
  - `src/schemas/response.ts` (`BaseResponseSchema`, `defineResponseSchema`)
  - `src/schemas/score.ts` (`BaseScoreSchema`, `defineScoreSchema`)
  - `src/schemas/system-prompt.ts` (`BaseSystemPromptSchema`, `defineSystemPromptSchema`)
- **Runtime components are class-based**:
  - Providers: `src/providers/abstract/provider.ts`, `src/providers/abstract/llm.ts`
  - Scorers: `src/scorers/abstract.ts`
  - Concrete implementations: `src/providers/openai.ts`, `src/providers/openrouter.ts`, `src/scorers/mcq.ts`, `src/scorers/llm-judge.ts`
- **Kind → implementation mapping** uses `Catalog`:
  - `src/catalog.ts` (generic `Catalog`)
  - `src/providers/catalog.ts` (`ProviderCatalog`, `ProviderInstanceCatalog`)
  - `src/scorers/catalog.ts` (`ScorerCatalog`, `ScorerInstanceCatalog`)
- **Runners are functions** typed via the generic `Runner` type in `src/types.ts` (no runner factory currently).
  - Example runner: `src/benchmarks/peerbench/runner.ts`
- **ID generation is host-overridable**:
  - `src/types.ts` (`IdGenerator`)
  - `src/helpers/generate-default-id.ts` (uses host generator if provided, otherwise default)
  - Default generator: `src/generators/id-generator-uuidv7.ts`
- **Loaders** fetch + map data into usable in-memory objects:
  - `src/loaders/factory.ts` (`createLoader(load, map?)`)
  - Example: `src/loaders/json.ts` (`JSONFileLoader` uses Node `fs`; browser loaders need alternatives)

## 2025-12-30 — System Prompts

### Q&A

**Q: Where should the system prompt concept live in the repo?**  
**A:** Because system prompts are LLM-specific, keep prompt _schemas_ under `src/schemas/llm/` and prompt base schema/types under `src/schemas/system-prompt.ts`. Runners can accept an optional `systemPrompt` argument and decide how to apply it.

**Q: What is the runtime form of a system prompt passed to a runner?**  
**A:** A richer object (not a plain string). The runner implementation is responsible for how to use it.

**Q: Is the system prompt per-run or per-test-case?**  
**A:** Per-run. The system prompt applies to all test cases in the run. If a host app wants per-test-case prompts, it can extend the test-case schema with an additional field and handle it in the runner.

**Q: Any blocker for host apps implementing per-test-case prompts via schema extension?**  
**A:** No blocker in principle, assuming the runner defines the precedence/merge rule (run-level vs test-case-level) and the host app persists/serializes whatever it needs for reproducibility.

**Q: Who is responsible for prompt composition?**  
**A:** The runner. If the runner can format/render a prompt into the actual string/message(s), that’s acceptable.

**Q: What templating engine should be used for variables?**  
**A:** Considering Mustache because it’s popular.

**Q: How do variables work exactly (missing variables, types, etc.)?**  
**A:** Not decided yet.

**Q: Should a system prompt contain a `versions` array?**  
**A:** No. Each version is a separate entity. Current base schema includes `version: number` on the prompt object (`src/schemas/system-prompt.ts`).

**Q: Who owns storage and migration of system prompts?**  
**A:** Not decided yet.

**Q: Who decides “how to use a system prompt” (message placement, formatting, etc.)?**  
**A:** The runner.

**Q: Should we keep chatting normally after logging decisions to `SPEC_HISTORY.md`?**  
**A:** Yes — continue discussion here, but ensure key Q&A/decisions get appended to `SPEC_HISTORY.md`.

### Decisions

- System prompts are LLM-specific primitives and belong under `src/schemas/system-prompt.ts` + `src/schemas/llm/*`.
- System prompts are provided to runners as a richer object.
- System prompts are per-run by default.
- System prompt “versioning” is modeled as separate prompt entities (not an embedded `versions[]` history).
- Runner owns prompt composition and usage rules.
- Keep ongoing chat in the thread; record key outcomes in `SPEC_HISTORY.md`.

### Open Questions

- Variable semantics: typing, defaults, missing-variable behavior.
- Prompt persistence/migration strategy (SDK helper vs host-app-only).
- Canonical serialization format for prompt entities (if any).

### Notes / Recommendations (agent)

- Per-run-only is a solid default; allowing host apps to add per-test-case prompts via schema extension is compatible, but runners should document precedence (e.g., run prompt + test-case prompt).
- Modeling versions as separate entities simplifies parsing and avoids “history arrays”; consider adding a stable `familyId` (or `promptId`) + a `version` field to keep “same prompt, different versions” queryable.
- Mustache is fine if you keep it optional and runner-owned; the SDK can define a small `render(vars)` hook so templating engines remain swappable.

## 2025-12-30 — Benchmarks vs Test Cases (Separation)

### Q&A

**Q: Should test cases be separated from benchmarks so each test case declares which benchmark it belongs to?**  
**A:** Yes, it’s applicable and often a better fit for large datasets and persistence: keep `Benchmark` as the “definition/metadata”, and pass test cases as a separate collection/stream. Each test case can carry a `benchmarkRef` (e.g., `{ benchmarkId, benchmarkKind, benchmarkSchemaVersion? }`) so storage/querying is easy.

### Notes / Recommendations (agent)

- **Implementation status:** The current SDK does not define a dedicated `Benchmark` entity schema, and runners are typed to accept `testCases: TTestCase[]` (arrays) via `Runner` in `src/types.ts`.
- Separation is still compatible: a host app can store benchmarks (manifest/spec) separately and pass whichever subset of test cases it wants to the runner.
- If adding `benchmarkRef`/`benchmarkId` fields to test cases, they should be defined in the _benchmark-specific test-case schema_ (extending `BaseTestCaseSchema`), and runners can optionally validate they match.

**Q: If the runner wires everything, why do we need a benchmark entity at all?**  
**A:** You may not need a benchmark entity for the _minimum_ “run a list of test cases” flow. The benchmark entity becomes valuable as a persisted, versioned _manifest/contract_: discovery (name/description), shared config/defaults, schema/migration boundary, reproducibility (run artifacts can pin benchmark spec + dataset id), and guardrails against mixing incompatible test cases. A valid alternative is to make `benchmark` optional and run purely off `testCase.kind` + runner config when you don’t need those properties.

## 2025-12-30 — Class vs Function Architecture

### Q&A

**Q: Were the “class-based architecture” issues only applicable to port/provider implementations? What about other entities?**  
**A:** Mostly yes. Pure data entities (test cases, responses, scores, system prompts) work best as plain serializable objects with schemas. Capability-bearing components (providers, scorers) can be class-based for nominal types and runtime behavior, while still preserving type safety via base abstract classes.

### Notes / Recommendations (agent)

- Keep _entities_ as plain objects validated by schemas (`zod`) to preserve easy JSON serialization, disk persistence, and migration.
- Current code uses classes for providers/scorers and uses `Catalog` for kind-based lookup/instantiation.

## 2025-12-30 — Decorator-Based Architecture

### Q&A

**Q: Can we rely on decorators and convert to a decorator-based architecture without sacrificing DX?**  
**A:** Decorators can help with _registration/metadata_ (e.g., attaching `kind`, supported ports, schema info) but they generally do **not** replace the function-factory approach for TypeScript DX. TS does not infer instance method/property shapes from decorator arguments; you still need base interfaces/abstract classes (or factories) to enforce “you must implement these methods”. A hybrid is plausible: keep factories for typing/enforcement and optionally add decorators as syntactic sugar for registries.

### Notes / Recommendations (agent)

- Decorators primarily add runtime metadata; they don’t give the same “fill these fields” IntelliSense you get from config-object factories.
- Using decorators also introduces build/tsconfig constraints (legacy vs TS 5+ standard decorators) and may require extra runtime support (e.g., `reflect-metadata`) if you want type metadata at runtime.
- If you want “class names are types” for DX, consider “factory returns a class” (`defineX(...) => class X { ... }`) as a hybrid that keeps inference and yields a nominal type.

## 2025-12-30 — Benchmark Author Checklist

When implementing a new benchmark, the author should be able to answer:

- **Goal:** What capability/behavior does this benchmark measure, and what’s in/out of scope?
- **Task spec:** What is the test-case input shape and what is the expected model output shape?
- **Success criteria:** What does a “good” response look like (constraints, required fields, structure)?
- **Interaction pattern:** Single-turn vs multi-turn; any required response format (text vs JSON).
- **Provider requirements:** Which port(s) does the runner require and what provider assumptions exist?
- **Runner outputs:** What response `data` and `metadata` should be produced (raw text, parsed JSON, extracted fields)?
- **Scoring strategy:** How are responses scored (deterministic, heuristic, LLM-judge) and what are failure modes?
- **Scorer dependency:** Is the scorer benchmark-specific or reusable? Which scorer `kind`(s) are supported?
- **Schema/versioning:** What are `kind` + `schemaVersion` for benchmark/test-case/response/score, and expected migrations?
- **IDs & persistence:** Which entities must be serializable/storable, and which IDs must be stable vs host-generated?
- **Config knobs:** What `runConfig` exists and how is it validated?
- **Reproducibility:** What must be logged/persisted to reproduce results (model, params, judge model/rubric, prompts)?
- **Result meaning:** What does the score represent and how should it be aggregated across test cases?

## 2025-12-30 — Registry Naming

### Q&A

**Q: If "registry" is needed for something else, what can we call the generic 'map string identifier → implementation (factory/instance)' concept?**  
**A:** Common alternatives include **catalog**, **directory**, **repository** (DDD), **resolver**, **router**, **provider map**, **component map**, **plugin manager**, or **container** (if it supports DI + lifecycles). Current code uses `Catalog` (`src/catalog.ts`).

## 2025-12-30 — Adapting Old SDK Benchmarks to New Tooling

### Q&A

**Q: How should old SDK benchmarks be adapted to the new tooling structure?**  
**A:** Each benchmark type from the old SDK (`peerBench/packages/sdk`) should be adapted by:

1. Creating test case, response, and score schemas using `defineTestCaseSchema`, `defineResponseSchema`, and `defineScoreSchema` in `src/benchmarks/peerbench/test-cases/`
2. Using `kind` identifiers prefixed with `pb.` (e.g., `pb.mcq`, `pb.open-ended`, `pb.text-replacement`)
3. Updating the unified runner (`src/benchmarks/peerbench/runner.ts`) to handle all benchmark types via union types
4. Using appropriate scorers: `MCQScorer` for multiple choice, `LLMJudgeScorer` for open-ended and text replacement

**Q: Should each benchmark type have its own runner or a unified runner?**  
**A:** Unified runner. The runner accepts a union type of test cases and handles each `kind` appropriately. This keeps the API simple while allowing type safety.

**Q: How should prompt formatting be handled for different benchmark types?**  
**A:** Each benchmark type has its own formatting function (e.g., `formatMCQPrompt`, `formatOpenEndedPrompt`, `formatTextReplacementPrompt`) that the runner calls based on the test case `kind`.

**Q: Which scorers should be used for each benchmark type?**  
**A:**

- Multiple Choice: `MCQScorer` (algorithmic, extracts answers from response)
- Open Ended: `LLMJudgeScorer` (compares candidate answer to reference answer)
- Text Replacement: `LLMJudgeScorer` (compares reconstructed text to original text)

### Decisions

- Benchmarks are organized under `src/benchmarks/peerbench/test-cases/` with one file per benchmark type
- Each benchmark type defines three schemas: test case, response, and score
- The runner is unified and handles all benchmark types via discriminated unions on the `kind` field
- Prompt formatting is benchmark-specific but handled within the unified runner
- Scorer selection is based on benchmark type and provided via the `scorer` parameter

### Implementation Status

- ✅ Multiple Choice (MCQ) - already implemented in example
- ✅ Open Ended - adapted with test case/response/score schemas and runner support
- ✅ Text Replacement (TRP) - adapted with test case/response/score schemas and runner support

## 2026-01-01 — Runner API: Per-TestCase Execution

### Q&A

**Q: Should a runner accept an array of test cases (`runBenchmark`) or a single test case (`runTestCase`)?**  
**A:** Prefer `runTestCase`: the runner executes exactly one test case and returns a single `{ response, score? }` result. Benchmark-level orchestration (iterating over multiple test cases, concurrency, retries, aggregation, persistence) should live outside the runner and can be implemented as a thin helper built on top of `runTestCase`.

**Q: What is an “orchestrator” in this SDK? Can/should it be standardized like runners?**  
**A:** An orchestrator is the component that runs *many* test cases by repeatedly calling a `Runner`/`runTestCase`, and is responsible for cross-cutting concerns like concurrency, rate limiting, retries, progress reporting, checkpointing, persistence, and aggregation. Yes—this can be standardized as an interface/type (e.g. `Orchestrator` / `SuiteRunner`) that takes a `Runner` and a list/stream of test cases and returns a structured run summary.

**Q: Any naming improvements for “runner” vs “orchestrator”?**  
**A:** Consider reserving “runner” for the single-test-case function and using “suite”/“batch” terminology for orchestration (e.g. `runTestCase` + `runSuite`), to avoid “runner” meaning both “one” and “many”.

### Decisions

- `Runner` executes one `testCase` and returns `RunnerResult` (single response + optional score).
- Higher-level code is responsible for looping over many test cases and producing batch/benchmark summaries.
- Add/keep a standardized “suite/batch orchestration” abstraction separate from `Runner`.

### Naming Candidates (agent)

- Single test case: `runTestCase` / `executeTestCase` / `evaluateTestCase` (pick one verb and use it everywhere).
- Many test cases: `runSuite` / `runBatch` / `runDataset` / `runEvaluation` (avoid “runner” here to reduce ambiguity).
- Component names: `Executor` (single) + `SuiteRunner`/`BatchRunner` (many), or `CaseEvaluator` (single) + `Harness` (many).

### References (best-practice vocabulary)

- “Harness” is commonly used for “run a dataset with an engine + metrics” (e.g., EleutherAI’s *lm-evaluation-harness*).
- “Evals/Evaluator” is common in LLM evaluation tooling (e.g., OpenAI Evals, LangChain/LlamaIndex evaluation modules).

## 2026-01-01 — Naming Preference: Case/Batch

### Q&A

**Q: Which naming set should we adopt for single vs many test-case execution?**  
**A:** Prefer the “case/batch” terminology: `runCase` for a single test case and `runBatch` for multiple test cases. This keeps “one vs many” explicit and avoids overloading “runner”.

### Decisions

- Use `runCase` (single) and `runBatch` (many).
- Prefer type names `CaseRunner` (single) and `BatchRunner` (many) if/when we formalize the orchestrator abstraction.

## 2026-01-01 — System Prompt Placement (LLM-Specific Capability)

### Q&A

**Q: Is it a good idea to keep `systemPrompt` in the generic runner params, even though only LLM/chat providers support it?**  
**A:** Usually no: putting `systemPrompt` in the *generic* `RunnerParams` leaks an LLM-specific concept into the base abstraction and will confuse/limit non-LLM providers (e.g., translation, embeddings, rerankers). Prefer capability-based typing: only runners that target an LLM/chat provider should accept `systemPrompt`.

**Q: What’s a good standard way to model this?**  
**A:** Keep `Runner` generic over a `TParams` type. Define provider “ports” (already started with `AbstractLLMProvider`) and create param types per port, e.g. `ChatRunnerParams` extends base params with `provider: AbstractLLMProvider` and `systemPrompt?: BaseSystemPrompt`. Other domains (translation, embeddings) define their own provider abstract + params without `systemPrompt`.

### Decisions

- Treat `systemPrompt` as a chat/LLM capability, not a universal runner input.
- Standardize per-provider “port” param types (e.g. `ChatRunnerParams`, `TranslationRunnerParams`) instead of widening the base.

### References (who does this)

- LangChain distinguishes chat models vs text LLMs and has explicit system/human/AI message roles: https://js.langchain.com/
- OpenAI API separates chat-completions from other modalities/endpoints; “system” role is specific to chat-style messaging: https://platform.openai.com/docs/
- EleutherAI’s lm-evaluation-harness separates “task evaluation loop” from “model interface”: https://github.com/EleutherAI/lm-evaluation-harness

## 2026-01-01 — Where To Put Type Definitions

### Q&A

**Q: What is the best place to put type definitions?**  
**A:** Use a layered approach: keep *shared, cross-cutting* public types in a dedicated `src/types/` (or a single `src/types.ts` while small), colocate *domain-specific* types next to the feature that owns them, and prefer deriving data-shape types from schemas to avoid drift.

### Decisions

- **Public/shared types:** place in `packages/sdk-0.2/src/types/` (or keep `src/types.ts` until it grows, then split by topic like `types/runner.ts`, `types/catalog.ts`).
- **Domain-local types:** colocate under the owning module (e.g., `src/benchmarks/peerbench/...`, `src/providers/...`) and export only if needed.
- **Schema-backed shapes:** when a runtime schema exists (`zod`), prefer `z.infer<typeof Schema>` as the canonical TypeScript type.
- **Avoid circular deps:** `src/types/*` should not import from high-level modules (benchmarks/providers); instead depend “downwards” on `schemas/*` and small “ports” (abstract provider/scorer types).

## 2026-01-01 — SDK Export Best Practices

### Q&A

**Q: What is the best practice for exporting things from the SDK?**  
**A:** Keep a small, intentional public API surface: export a curated set from a single entrypoint (and optionally a few stable subpath entrypoints), and treat everything else as internal. Enforce this via `package.json` `exports` so consumers can’t deep-import internals accidentally.

### Decisions

- **Curated entrypoint:** `src/index.ts` re-exports only the supported public API (types, schemas, high-level helpers).
- **No accidental barrels:** avoid `export * from "./**"` across the whole tree; re-export per-module intentionally to keep stability and docs clear.
- **Subpath exports (optional):** if the API grows, add stable subpaths (e.g. `@peerbench/sdk/providers`, `.../benchmarks`, `.../schemas`) via `exports` map rather than encouraging deep imports into `dist/...`.
- **Keep internals internal:** put non-public modules under `src/internal/` (or similar) and don’t export them; reserve breaking changes for major versions.
- **Types vs runtime:** use `export type { ... }` for type-only exports (better tree-shaking and clearer intent).

## 2026-01-01 — Build Output vs Exports (tsup/tree-shaking)

### Q&A

**Q: Why does tsup “remove” some benchmark imports/exports?**  
**A:** tsup only emits runtime code reachable from configured `entry` files, and esbuild tree-shakes unused runtime exports. Anything not imported/re-exported from an entry (or imported only as a type) won’t show up in the JS output.

**Q: What’s the recommended fix for benchmarks?**  
**A:** Don’t rely on side-effect registration. Either:
1) Re-export benchmarks from the main entrypoint (e.g. `export * as benchmarks from "./benchmarks"` or `export * from "./benchmarks"`), or
2) Add explicit subpath entrypoints (e.g. `src/benchmarks/index.ts`) and wire them via `package.json` `exports` (and add them to tsup `entry`).

### Decisions

- Benchmarks should be exported intentionally (main entry or explicit subpath), not discovered via side effects.

### Note: Type-Only Modules

If a source file only contains TypeScript types (e.g. `export type ...`), the emitted `.js` can be effectively empty. Some bundlers (notably in app tooling) may treat that output as a “script” rather than an ESM module, which can break `export * from "./that-file.js"` re-exports. Mitigation: add `export {};` to force a runtime ESM marker, or avoid re-exporting type-only modules at runtime.

## 2026-01-01 — Benchmark Building Blocks (Loader/Schema/Runner/Scorer)

### Q&A

**Q: Any contradictions between the intended benchmark workflow (loader+mapper → schemas → runner → scorer) and current `sdk-0.2`?**  
**A:** Mostly aligned, with a few important nuances:
1) “Loader + mapper” already exists as `createLoader(load, map)`; most current loaders are “content → array → builders” rather than “DB rows → mapper”, but the pattern supports SQLite-style loaders.
2) The `testCase <-> response <-> score` relationship is indeed mostly implicit via IDs (`response.testCaseId`, `score.responseId`). We don’t currently enforce referential integrity (e.g., a score referencing a missing response) at the schema level.
3) Scorers don’t always receive “the response object + test case object” directly; runners often translate those into scorer-specific inputs (e.g. MCQ scorer gets `response` text + `choices` + `correctAnswers`).

**Q: What are the main open questions/risks before we generalize this for many benchmark types and non-LLM providers?**  
**A:** Standardize the *contract boundaries* (what must be runtime-validated vs what can remain type-level), and define “ports” for provider/scorer capabilities (chat vs translation vs embeddings) so runner params don’t become a kitchen-sink.

### Decisions

- Treat `Loader` as `load(params) -> raw` + `map(raw) -> { testCases, responses, scores }` (mapping can be embedded via builders).
- Keep ID-based linking, but add optional integrity validation hooks (loader-level or separate validator) as the system grows.
- Keep scorers schema-agnostic where possible by passing minimal required fields (derived from test case/response) rather than entire versioned objects.

## 2026-01-01 — Hashing, Provenance, and “Hidden” Data

### Q&A

**Q: We didn’t design for hash calculations or hidden/private data. Is that a problem now, or can we add it later?**  
**A:** You can add it later if you keep the core entities (test case/response/score) as **canonical, serializable objects** and avoid baking identity into mutable fields. But it’s worth making two small “future-proof” choices now: (1) decide what is considered *hashable canonical content* vs *non-hash metadata*, and (2) decide how “private/hidden” fields are represented and redacted.

**Q: What’s the minimal approach that won’t paint us into a corner?**  
**A:** Add hashing as an *optional layer*:
1) Define a canonical serialization for hashing (e.g., stable key ordering + exclude volatile fields like timestamps/cost/token counts).  
2) Compute a `digest` (e.g., `sha256:<hex>`) for test cases (and optionally responses/scores) as a derived field or alongside persisted artifacts.  
3) Treat “hidden” data as separate from the public schema: either store it out-of-band (recommended) or under a clearly named optional field that can be stripped (`privateMetadata`, `secretsRef`, etc.).

### Decisions

- Hashing/provenance is a separate concern from running/scoring; implement as optional utilities or an orchestration-level feature, not inside `Runner`.
- Keep a clear boundary between canonical fields (hashable) and operational metadata (non-hash, potentially sensitive).

### Follow-up: “NonRevealedPrompt” (from prior SDK)

**Q: Do we need a `NonRevealedPrompt`-style concept in `sdk-0.2` (like the previous SDK had)?**  
**A:** We likely need the *capability* (publish/share a dataset without revealing sensitive prompt/context, while still being verifiable via hashes), but we should avoid hard-coding it as a prompt-specific one-off type. In `sdk-0.2`, the equivalent should be a generic “redaction” mechanism usable by any benchmark entity (test case/response/score) and any modality.

**Recommended approach:** represent secret content out-of-band and keep only verifiers in-band:
- Store public entity fields + stable digests (e.g., `sha256`, optional `cid`) for any redacted strings/blobs.
- Use a `secretsRef`/`privateBlobRef` to fetch material at runtime (not shipped in public JSON).

**Decision:** don’t introduce a `NonRevealedPrompt` special type in the core schemas; model redaction generically so benchmarks can mark specific fields as hidden without the whole SDK becoming “prompt-centric”.

## 2026-01-01 — SDK vs Host Responsibilities

### Q&A

**Q: If the host application does most of the work, what’s the purpose of the SDK?**  
**A:** The SDK’s job is to provide the *portable, reusable core* (contracts + reference implementations) so every host app doesn’t re-implement the same evaluation logic differently. The host app owns product-specific concerns (UI, storage, auth, infra), while the SDK owns the domain primitives and invariants (schemas, runner/scorer/provider interfaces, loaders, canonical serialization, and well-tested utilities).

### Decisions

- SDK should be the source of truth for entity schemas/types and compatibility rules; hosts should not fork these definitions.
- SDK should include common loaders, runners, scorers, and utilities that are broadly reusable; orchestration/persistence can be standardized later but remain optional/pluggable.

## 2026-01-01 — “Source Of Truth” For Benchmarks

### Q&A

**Q: The SDK leaves too much responsibility to the host app; is the SDK just scaffolding?**  
**A:** If the host must implement benchmark schemas/loaders/runners itself, the SDK is not the source of truth—it becomes a toolkit. To make the SDK the source of truth, benchmark *definitions* (schemas + compatibility/versioning + reference loader + reference runner/scorer contracts) must live in the SDK (or in official SDK-owned “benchmark packs”), and hosts should mainly compose/run/persist them.

### Decisions

- Treat benchmark definitions as **SDK-owned artifacts** (or SDK-owned plugin packages), not something every host re-implements.
- Hosts may add custom benchmarks via a plugin API, but built-in benchmarks should ship with the SDK and be imported—not redefined.

## 2026-01-05 — FNOL Benchmark (Two-LLM Conversation)

### Q&A

**Q: How does the FNOL benchmark run without a real user?**  
**A:** It uses two LLMs: (1) the **target** model under test conducts the FNOL intake, and (2) a **user simulator** model answers using the test case’s `userProfile`. The runner loops for `maxTurns` back-and-forth turns.

**Q: How do we extract “collected information” deterministically?**  
**A:** The target model is instructed to output **only JSON** when it believes it’s done. If the runner reaches `maxTurns` without a valid JSON object, it forces a final “output JSON now” step.

**Q: What scoring is supported?**  
**A:** FNOL supports (a) a deterministic field completeness/correctness scorer (`FNOLFieldsScorer`) using `fieldsToCollect[*].expected` when provided, and (b) `LLMJudgeScorer` for rubric-based evaluation. Other scorers are intentionally not part of this benchmark’s contract.

**Q: Can the host use different providers/models for target vs user simulation?**  
**A:** Yes: the runner accepts `provider` and an optional `userSimulatorProvider` (defaults to `provider`), and separate model slugs in `runConfig`.

### Decisions

- FNOL is modeled as a **multi-turn conversation benchmark**, but still fits the SDK runner shape by treating “one test case” as “one simulated interview”.
- The runner’s output `Response` stores the full conversation and optional parsed `extracted` JSON object.

## 2026-01-08 — Data Quality App ↔ Backtesting Framework

### Q&A

**Q: What is the relationship between `dev-simple_question_data_quality` and `renisa/packages/backtesting`?**  
**A:** There is no direct code dependency between them, but they can share the same Supabase database tables (notably `conversation_logs`, `conversation_scores`, and `comments`). The web app provides UI/admin workflows to create/browse/score/manage content, while the backtesting framework can query those tables to analyze and backtest prompt/agent behavior.

**Q: From which tables can exports like `answers_Franzi_all.json` be produced?**  
**A:** The export is produced by querying `answers` (raw answer text + structured columns like `insured`/`liable`), joining `questions` (question text), `user_settings` (display name), and optionally `scores` (for averages/fallback selection). Fields like `begruendung`, `unsicher_anmerkung`, and `relevante_paragraphen` are derived by parsing `answers.text_body` rather than coming from dedicated DB columns.

### Decisions

- Treat the web app as the **source UI** for curation/labeling, and the backtesting framework as a **consumer** that can query the same Supabase dataset for evaluation/monitoring.

## 2026-01-08 — `apps/renisa-cli` Split Into Independent Monorepo

### Q&A

**Q: Should we update the root workspace to exclude `apps/renisa-cli`?**  
**A:** No. The folder will be made into its own monorepo first and then moved elsewhere; no changes to the current repo’s Turborepo/workspaces are needed.

**Q: Where should CLI-related assets live after the split (e.g. `data/`, `debug/`, `.env`)?**  
**A:** Move them under the CLI package at `apps/renisa-cli/apps/cli/` along with the source/config/build files.

### Decisions

- Convert `apps/renisa-cli/` into a standalone Turborepo monorepo root (its own `package.json` + `turbo.json`) and move the existing CLI package to `apps/renisa-cli/apps/cli/`.
