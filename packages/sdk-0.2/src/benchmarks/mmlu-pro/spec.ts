import {
  BaseBenchmarkSpecSchemaV1,
  defineBenchmarkSpecSchema,
} from "@/schemas/benchmark-spec";
import z from "zod";

export const MMLUProBenchmarkSpecSchemaV1 = defineBenchmarkSpecSchema({
  baseSchema: BaseBenchmarkSpecSchemaV1,
  kind: "mmlu-pro.benchmark.spec",
  schemaVersion: 1,
  fields: {},
});
export type MMLUProBenchmarkSpecV1 = z.infer<
  typeof MMLUProBenchmarkSpecSchemaV1
>;
