import { z } from "zod";
import { defineSystemPromptSchemaV1 } from "./system-prompt";

export const SimpleSystemPromptSchemaV1 = defineSystemPromptSchemaV1({
  kind: "sys-prompt.simple",
  schemaVersion: 1,
  fields: {
    content: z.string(),
  },
});
export type SimpleSystemPromptV1 = z.infer<typeof SimpleSystemPromptSchemaV1>;
