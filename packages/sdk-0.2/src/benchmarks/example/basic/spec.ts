import { BaseBenchmarkSpecSchemaV1, defineBenchmarkSpecSchema } from "@/schemas";
import z from "zod";

/**
 * Tutorial: what is a "BenchmarkSpec"?
 *
 * A BenchmarkSpec is an optional, persisted config blob that travels with a dataset/run.
 * It is useful for:
 * - benchmark-level knobs (shared across many test cases)
 * - prompt templates or reusable text blobs (when you don't want them embedded in every test case)
 * - UI/configuration metadata for host apps
 *
 * It is NOT meant for secrets. If you need private prompts/docs, store them out-of-band and
 * keep only hashes/references in the spec (see `SPEC_HISTORY.md` redaction notes).
 *
 * How it’s used:
 * - loaders may load a spec from a separate file and return it as `benchmarkSpec`
 * - runners accept the spec and use it to shape prompt formatting or runtime behavior
 *
 * See usage in `packages/sdk-0.2/src/benchmarks/example/basic/runner.ts`.
 */
export const ExampleBenchmarkSpecSchemaV1 = defineBenchmarkSpecSchema({
  baseSchema: BaseBenchmarkSpecSchemaV1,
  kind: "example.benchmark.spec",
  schemaVersion: 1,
  fields: {
    promptPrefix: z.string().optional(),
    promptSuffix: z.string().optional(),
  },
});

export type ExampleBenchmarkSpecV1 = z.infer<typeof ExampleBenchmarkSpecSchemaV1>;
