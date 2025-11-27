import { MaybePromise, Prompt, PromptResponse, PromptScore } from "@/types";

/**
 * Abstract Registry class
 *
 * A Registry implementation is responsible from sending, receiving and doing
 * other operations with an external service such as a remote server.
 */
export abstract class AbstractRegistry {
  /**
   * The unique identifier of the Registry.
   */
  abstract readonly identifier: string;

  /**
   * Uploads the given prompts to the Registry.
   *
   * @returns the number of prompts uploaded
   */
  abstract uploadPrompts(
    prompts: Prompt[],
    options?: Record<string, any>
  ): MaybePromise<number>;

  /**
   * Uploads the given responses to the Registry.
   *
   * @returns the number of responses uploaded
   */
  abstract uploadResponses(
    responses: PromptResponse[],
    options?: Record<string, any>
  ): MaybePromise<number>;

  /**
   * Uploads the given scores to the Registry.
   *
   * @returns the number of scores uploaded
   */
  abstract uploadScores(
    scores: PromptScore[],
    options?: Record<string, any> & {
      /**
       * Whether to include the response and prompt data in the scores
       */
      includeData?: boolean;
    }
  ): MaybePromise<number>;
}
