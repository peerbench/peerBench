import { BaseBenchmarkSpecSchemaV1, defineBenchmarkSpecSchema } from "@/schemas";
import z from "zod";

/**
 * Benchmark spec is an optional entity that holds benchmark-level configuration.
 * It is not a test case; it is applied to the whole dataset/run.
 *
 * Typical use cases:
 * - prompt wrappers and templates that you don't want to repeat in every test case
 * - UI metadata for host apps
 *
 * It is not recommended to store secrets inside the spec. If you need to store private content,
 * host application should store it out-of-band and keep only references/hashes in the spec.
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
