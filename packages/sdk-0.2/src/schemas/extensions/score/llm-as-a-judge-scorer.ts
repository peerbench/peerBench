import z from "zod";

/**
 * Provides a set of fields that holds information about the AI model
 * that was used to calculate the score.
 */
export const ExtensionLLMAsAJudgeScorerFieldsV1 = {
  scorerAIProvider: z.string().optional(),
  scorerAIModelSlug: z.string().optional(),
  scorerAIInputTokensUsed: z.number().optional(),
  scorerAIOutputTokensUsed: z.number().optional(),
  scorerAIInputCost: z.string().optional(),
  scorerAIOutputCost: z.string().optional(),
};
