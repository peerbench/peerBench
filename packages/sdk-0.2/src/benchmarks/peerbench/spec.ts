import {
  BaseBenchmarkSpecSchemaV1,
  defineBenchmarkSpecSchema,
} from "@/schemas/benchmark-spec";
import z from "zod";

export const PeerbenchBenchmarkSpecSchemaV1 = defineBenchmarkSpecSchema({
  baseSchema: BaseBenchmarkSpecSchemaV1,
  kind: "pb.benchmark.spec",
  schemaVersion: 1,
  fields: {
    /**
     * Big text contents that can be referred as <text>{key}</text> in a prompt or system prompt.
     */
    blobTexts: z.record(z.string(), z.string()).optional(),
  },
});
export type PeerbenchBenchmarkSpecV1 = z.infer<
  typeof PeerbenchBenchmarkSpecSchemaV1
>;
