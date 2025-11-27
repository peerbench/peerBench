import { z } from "zod";
import { DIDasUUIDSchema } from "./validation/did";

export const PromptTypes = {
  MultipleChoice: "multiple-choice",
  OrderSentences: "order-sentences",
  TextReplacement: "text-replacement",
  Typo: "typo",
  OpenEnded: "open-ended",
  OpenEndedWithDocs: "open-ended-with-docs",
} as const;

export type PromptType = (typeof PromptTypes)[keyof typeof PromptTypes];

export const ScoringMethods = {
  /**
   * Scored by a human
   */
  human: "human",

  /**
   * Scored using an AI model
   */
  ai: "ai",

  /**
   * Scored using an algorithm
   */
  algo: "algo",
} as const;

export type ScoringMethod =
  (typeof ScoringMethods)[keyof typeof ScoringMethods];

export const PromptSchema = z
  .object({
    /**
     * Unique identifier of the Prompt
     */
    promptUUID: DIDasUUIDSchema, // This schema also accepts without `did:<entity type>:` prefix

    /**
     * Prompt data itself
     */
    prompt: z.string(),

    /**
     * CID v1 calculation of the Prompt string
     */
    promptCID: z.string(),

    /**
     * SHA256 hash of the Prompt string
     */
    promptSHA256: z.string(),

    /**
     * Multiple choice answers for the question where the keys are letters and the values are the answers.
     */
    options: z.record(z.string(), z.string()).optional(),

    /**
     * Full Prompt string that is being sent
     */
    fullPrompt: z.string(),

    /**
     * CID v1 calculation of the full Prompt string
     */
    fullPromptCID: z.string(),

    /**
     * SHA256 hash of the full Prompt string
     */
    fullPromptSHA256: z.string(),

    /**
     * Type of the Prompt
     */
    type: z.nativeEnum(PromptTypes),

    /**
     * Expected option value for the question
     */
    answer: z.string().optional(),

    /**
     * Expected letter of the answer (e.g "A", "B" or "C")
     */
    answerKey: z.string().optional(),

    /**
     * Additional metadata related to the Prompt
     */
    metadata: z.record(z.string(), z.any()).optional(),

    /**
     * Expected Scorer identifiers that can be used to
     * score the Responses for this Prompt
     */
    scorers: z.array(z.string()).optional(),
  })
  .transform((prompt, ctx) => {
    if (prompt.type === PromptTypes.MultipleChoice) {
      if (Object.keys(prompt.options || {}).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No options provided for multiple choice question",
        });
        return z.NEVER;
      }

      if (
        Object.values(prompt.options || {}).some(
          (value) => value?.trim() === ""
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiple choice options cannot be empty",
        });
        return z.NEVER;
      }

      if (!prompt.answerKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer key cannot be empty",
        });
        return z.NEVER;
      }

      if (!prompt.answer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer value cannot be empty",
        });
        return z.NEVER;
      }
    }

    return prompt;
  });

export const NonRevealedPromptSchema = PromptSchema.sourceType().extend({
  prompt: z.undefined().catch(undefined),
  fullPrompt: z.undefined().catch(undefined),
  options: z.undefined().catch(undefined),
  answer: z.undefined().catch(undefined),
  answerKey: z.undefined().catch(undefined),
});

/**
 * peerBench Prompt object
 */
export type Prompt = z.infer<typeof PromptSchema>;

/**
 * Non-revealed peerBench Prompt object (not including the original Prompt data but only hashes)
 */
export type NonRevealedPrompt = z.infer<typeof NonRevealedPromptSchema>;

export const PromptResponseSchema = z.object({
  /**
   * Unique identifier of the Response
   */
  responseUUID: DIDasUUIDSchema,

  /**
   * Name of the Provider that the Response comes from
   */
  provider: z.string(),

  /**
   * String representation of the Model that was used by the Provider
   */
  modelSlug: z.string(),

  /**
   * The Prompt that used to achieve this Response.
   */
  prompt: PromptSchema,

  /**
   * CID v1 calculation of the Response data.
   */
  responseCID: z.string(),

  /**
   * SHA256 calculation of the Response data.
   */
  responseSHA256: z.string(),

  /**
   * Response data itself.
   */
  response: z.string(),

  /**
   * Timestamp when the Prompt sent to the Model
   */
  startedAt: z.number(),

  /**
   * Timestamp when the Model responded this particular Prompt.
   */
  finishedAt: z.number(),

  /**
   * Unique identifier of which run this Response belongs to
   */
  runId: z.string(),

  inputTokensUsed: z.number().optional(),
  outputTokensUsed: z.number().optional(),
  inputCost: z.string().optional(),
  outputCost: z.string().optional(),

  responseMetadata: z.record(z.string(), z.any()).optional(),
});

export const NonRevealedPromptResponseSchema = PromptResponseSchema.extend({
  response: z.undefined().catch(undefined),
  prompt: NonRevealedPromptSchema,
});

export type PromptResponse = z.infer<typeof PromptResponseSchema>;
export type NonRevealedPromptResponse = z.infer<
  typeof NonRevealedPromptResponseSchema
>;

export const PromptScoreSchema = PromptResponseSchema.extend({
  prompt:
    // Modify some of the fields of the Prompt in case
    // if the Score object doesn't want to include original Prompt data
    PromptSchema.sourceType().extend({
      options: PromptSchema.sourceType().shape.options.optional(),

      prompt: PromptSchema.sourceType().shape.prompt.optional(),
      fullPrompt: PromptSchema.sourceType().shape.fullPrompt.optional(),

      type: PromptSchema.sourceType().shape.type.optional(),
      answer: PromptSchema.sourceType().shape.answer.optional(),
      answerKey: PromptSchema.sourceType().shape.answerKey.optional(),
    }),
  response: z.string().optional(),

  /**
   * Unique identifier of this Scoring result. This is named
   * like this because `did` field represents the Response ID since
   * the Score object inherits from the Response object.
   */
  scoreUUID: DIDasUUIDSchema,

  /**
   * Additional metadata about the Scoring result. This is named
   * like this because `metadata` field represents the Response metadata since
   * the Score object inherits from the Response object.
   */
  scoreMetadata: z.record(z.string(), z.any()).optional(),

  score: z.number().min(0).max(1),
  method: z.nativeEnum(ScoringMethods),

  /**
   * Explanation about how the score was calculated.
   */
  explanation: z.string().optional(),

  // Only presented if the scoring method is `ai`
  scorerAIProvider: z.string().optional(),
  scorerAIModelSlug: z.string().optional(),
  scorerAIInputTokensUsed: z.number().optional(),
  scorerAIOutputTokensUsed: z.number().optional(),
  scorerAIInputCost: z.string().optional(),
  scorerAIOutputCost: z.string().optional(),
});
export type PromptScore = z.infer<typeof PromptScoreSchema>;

export type MaybePromise<T> = T | Promise<T>;

export type PromptOptions = Record<string, string>;
