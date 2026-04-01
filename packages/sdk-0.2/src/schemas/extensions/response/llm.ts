import { IdSchema } from "@/schemas/id";
import z from "zod";

/**
 * Provides a set of fields that holds information about the LLM and its response.
 */
export const ExtensionLLMResponseFieldsV1 = {
  data: z.string(),
  modelSlug: z.string(),
  provider: z.string(),
  systemPromptId: IdSchema.optional(),

  inputTokensUsed: z.number().optional(),
  outputTokensUsed: z.number().optional(),
  inputCost: z.string().optional(),
  outputCost: z.string().optional(),
};
