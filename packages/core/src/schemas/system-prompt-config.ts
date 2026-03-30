import z from "zod";

const SystemPromptConfigSchema = z.union([
  z.string().describe("Shorthand for inline system prompt content."),
  z.object({
    type: z.literal("inline"),
    content: z.string().describe("Inline system prompt content."),
  }),
  z.object({
    type: z.literal("file"),
    path: z.string().describe("Path to a system prompt file."),
  }),
  z.object({
    type: z.literal("langfuse"),
    name: z.string().describe("Langfuse prompt name."),
    label: z
      .string()
      .optional()
      .describe("Langfuse prompt label/version selector."),
    publicKey: z
      .string()
      .optional()
      .describe(
        "Langfuse public key (falls back to LANGFUSE_PUBLIC_KEY env var).",
      ),
    secretKey: z
      .string()
      .optional()
      .describe(
        "Langfuse secret key (falls back to LANGFUSE_SECRET_KEY env var).",
      ),
    baseUrl: z
      .string()
      .optional()
      .describe(
        'Langfuse base URL (falls back to LANGFUSE_HOST env var, then "https://cloud.langfuse.com").',
      ),
  }),
]);

type SystemPromptConfig = z.infer<typeof SystemPromptConfigSchema>;

export { SystemPromptConfigSchema, type SystemPromptConfig };
