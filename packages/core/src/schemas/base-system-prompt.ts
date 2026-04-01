import { z } from "zod";
import { IdSchema } from "./id";
import { buildSchemaDefiner } from "./schema-definer";
import { CATEGORIES, PEERBENCH_NAMESPACE } from "../types/common";

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
  "sys-prompt",
);

export const SimpleSystemPromptSchemaV1 = defineSystemPromptSchema({
  baseSchema: BaseSystemPromptSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: `${CATEGORIES.LLM}/simple`,
  schemaVersion: 1,
  fields: {
    content: z.string(),
  },
});

export type SimpleSystemPromptV1 = z.infer<typeof SimpleSystemPromptSchemaV1>;
