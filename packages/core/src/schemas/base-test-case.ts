import { z } from "zod";
import { IdSchema } from "./id";
import { buildSchemaDefiner } from "./schema-definer";

export const BaseTestCaseSchemaV1 = z.object({
  id: IdSchema,
  namespace: z.string(),
  schemaVersion: z.number(),
  kind: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BaseTestCaseV1 = z.infer<typeof BaseTestCaseSchemaV1>;

export const defineTestCaseSchema = buildSchemaDefiner(
  BaseTestCaseSchemaV1,
  "tc",
);
