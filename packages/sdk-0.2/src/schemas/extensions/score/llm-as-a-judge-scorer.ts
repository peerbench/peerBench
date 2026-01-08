import z from "zod";

/**
 * Provides a set of fields that holds information about the LLM model
 * that was used to judge the response.
 */
export const ExtensionLLMAsAJudgeScorerFieldsV1 = {
  scorerAISystemPrompt: z.string().optional(),
  scorerAIProvider: z.string().optional(),
  scorerAIModelSlug: z.string().optional(),
  scorerAIInputTokensUsed: z.number().optional(),
  scorerAIOutputTokensUsed: z.number().optional(),
  scorerAIInputCost: z.string().optional(),
  scorerAIOutputCost: z.string().optional(),
};
