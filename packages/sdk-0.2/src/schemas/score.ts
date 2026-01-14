import { IdSchema } from "./id";
import { ScoringMethod } from "@/types";
import { buildSchemaDefiner } from "./schema-definer";
import z from "zod";

export const BaseScoreSchemaV1 = z.object({
  id: IdSchema,
  namespace: z.string(),
  kind: z.string(),
  schemaVersion: z.number(),

  value: z.number(),
  responseId: IdSchema,
  explanation: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  scoringMethod: z.enum(ScoringMethod),
});
export type BaseScoreV1 = z.infer<typeof BaseScoreSchemaV1>;

export const defineScoreSchema = buildSchemaDefiner(BaseScoreSchemaV1, "sc");
