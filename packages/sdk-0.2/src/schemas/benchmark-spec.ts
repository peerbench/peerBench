import z from "zod";
import { buildSchemaDefiner } from "./schema-definer";

export const BaseBenchmarkSpecSchemaV1 = z.object({
  kind: z.string(),
  schemaVersion: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type BaseBenchmarkSpecV1 = z.infer<typeof BaseBenchmarkSpecSchemaV1>;

export const defineBenchmarkSpecSchema =
  buildSchemaDefiner<typeof BaseBenchmarkSpecSchemaV1.shape>();
