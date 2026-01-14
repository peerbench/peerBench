import { IdSchema } from "../id";
import { z } from "zod";
import { buildSchemaDefiner } from "../schema-definer";

export const BaseSystemPromptSchemaV1 = z.object({
  id: IdSchema,
  namespace: z.string(),
  kind: z.string(),
  schemaVersion: z.number(),
  version: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type BaseSystemPromptV1 = z.infer<typeof BaseSystemPromptSchemaV1>;

export const defineSystemPromptSchema = buildSchemaDefiner(
  BaseSystemPromptSchemaV1,
  "sys-prompt"
);
