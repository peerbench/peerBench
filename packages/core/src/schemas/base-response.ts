import { z } from "zod";
import { IdSchema } from "./id";
import { buildSchemaDefiner } from "./schema-definer";

export const BaseResponseSchemaV1 = z.object({
  id: IdSchema,
  namespace: z.string(),
  schemaVersion: z.number(),
  kind: z.string(),
  startedAt: z.number(),
  completedAt: z.number(),
  testCaseId: IdSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BaseResponseV1 = z.infer<typeof BaseResponseSchemaV1>;

export const defineResponseSchema = buildSchemaDefiner(
  BaseResponseSchemaV1,
  "rs",
);
