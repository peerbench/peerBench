import { BaseResponseSchemaV1, defineResponseSchema } from "../response";
import z from "zod";

/**
 * Base response schema specialized for LLM chat responses.
 */
export const BaseLLMChatResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  fields: {
    data: z.string(),
    modelSlug: z.string(),
    provider: z.string(),

    inputTokensUsed: z.number().optional(),
    outputTokensUsed: z.number().optional(),
    inputCost: z.string().optional(),
    outputCost: z.string().optional(),
  },
});
