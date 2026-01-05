import { IdSchema } from "./id";
import { buildSchemaDefiner } from "./schema-definer";
import z from "zod";

export const BaseResponseSchemaV1 = z.object({
  id: IdSchema,
  kind: z.string(),
  schemaVersion: z.number(),

  startedAt: z.number(),
  completedAt: z.number(),
  testCaseId: IdSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type BaseResponseV1 = z.infer<typeof BaseResponseSchemaV1>;

export const defineResponseSchema =
  buildSchemaDefiner<typeof BaseResponseSchemaV1.shape>();
