import { z } from "zod";
import { defineSystemPromptSchema } from "./system-prompt";
import { BaseSystemPromptSchemaV1 } from "./system-prompt";
import { CATEGORIES, PEERBENCH_NAMESPACE } from "@/constants";

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
