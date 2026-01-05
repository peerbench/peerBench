import { IdSchema } from "./id";
import { z } from "zod";
import { buildSchemaDefiner } from "./schema-definer";

export const BaseTestCaseSchemaV1 = z.object({
  id: IdSchema,
  kind: z.string(),
  schemaVersion: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type BaseTestCaseV1 = z.infer<typeof BaseTestCaseSchemaV1>;

export const defineTestCaseSchema =
  buildSchemaDefiner<typeof BaseTestCaseSchemaV1.shape>();
