import { z } from "zod";
import { defineSystemPromptSchema } from "./system-prompt";
import { BaseSystemPromptSchemaV1 } from "./system-prompt";

export const SimpleSystemPromptSchemaV1 = defineSystemPromptSchema({
  baseSchema: BaseSystemPromptSchemaV1,
  kind: "sys-prompt.simple",
  schemaVersion: 1,
  fields: {
    content: z.string(),
  },
});
export type SimpleSystemPromptV1 = z.infer<typeof SimpleSystemPromptSchemaV1>;
