import { MaybePromise, Prompt, PromptType } from "@/types";
import { z } from "zod";
import { buildPrompt as buildPromptUtil } from "@/utils/builder";

/**
 * Abstract prompt generator class
 */
export abstract class AbstractGenerator {
  abstract readonly identifier: string;
  abstract inputSchema: z.ZodSchema<unknown>;

  /**
   * Generate prompt from the collected source data
   * @param input - Raw input data that will be validated against inputSchema
   * @param options - Optional configuration options
   * @returns Promise resolving to an array of prompts
   */
  async generate(
    input: unknown,
    options?: Parameters<this["generatePrompts"]>[1]
  ): Promise<Prompt[]> {
    // Validate input using the schema
    const validatedInput = this.inputSchema.parse(input);

    // Call the protected method with validated input
    return this.generatePrompts(validatedInput, options);
  }

  /**
   * Abstract method that implementors MUST override.
   * This method receives already validated input data.
   *
   * NOTE: Callers must use `generate()` method
   */
  abstract generatePrompts(
    input: z.infer<(typeof this)["inputSchema"]>,
    options?: Record<string, any>
  ): Promise<Prompt[]>;

  /**
   * Checks whether the generator can handle the given input
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canHandle(input: any): MaybePromise<boolean> {
    return true;
  }

  /**
   * Initializes the generator (depends on the implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(...args: any[]): Promise<void> {
    // Default implementation does nothing
    // Implement in subclasses if needed
  }

  async buildPrompt(params: {
    /**
     * Base question
     */
    question: string;

    /**
     * For multiple choice prompts, includes each option as letter-answer pairs
     */
    options?: Record<string, string>;

    /**
     * Correct answer that is expected. For multiple choice prompts,
     * this is the letter of the correct answer.
     */
    correctAnswer: string;

    /**
     * The full Prompt text that will be sent.
     */
    fullPrompt: string;

    /**
     * Prompt type
     */
    type: PromptType;

    /**
     * Metadata
     */
    metadata?: Record<string, any>;

    /**
     * Expected Scorers that can be used to
     * score the Responses for this Prompt
     */
    scorers?: string[];
  }): Promise<Prompt> {
    // If the Prompt is a Multiple Choice, the answer data should be
    // the value of the correct answer key
    const answer =
      params.options === undefined || Object.keys(params.options).length === 0
        ? params.correctAnswer
        : params.options[params.correctAnswer]; // If the options is provided then the correctAnswer points to the letter of the correct answer

    // Answer key is only valid when the options are provided
    // which means the Prompt is a multiple choice question
    const answerKey =
      params.options === undefined || Object.keys(params.options).length === 0
        ? ""
        : params.correctAnswer;

    return buildPromptUtil({
      prompt: params.question,
      fullPrompt: params.fullPrompt,
      options: params.options,
      answer,
      answerKey,
      type: params.type,
      metadata: {
        generatorIdentifier: this.identifier,
        ...(params.metadata || {}),
      },
      scorers: params.scorers,
    });
  }
}
