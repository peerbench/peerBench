import { z } from "zod";

const ProviderConfigSchema = z
  .object({
    provider: z.string().describe("Provider name (must exist in the provider registry)."),
    params: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Provider-specific parameters."),
  })
  .meta({
    "x-render-as": "provider",
  });

type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export { ProviderConfigSchema, type ProviderConfig };
