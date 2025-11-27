import { PromptResponse, MaybePromise, PromptScore } from "@/types";

/**
 * Abstract base class for scorers
 */
export abstract class AbstractScorer {
  /**
   * Unique identifier for the scorer
   */
  abstract readonly identifier: string;

  /**
   * Score a single response
   * @param response The response to score
   * @param options Additional options for scoring
   * @returns PromptScore object including the given Response, Prompt and the calculated Score
   */
  abstract scoreOne(
    response: PromptResponse,
    options?: Record<string, any>
  ): MaybePromise<PromptScore | undefined>;

  /**
   * Checks whether the scorer is eligible to score the given response
   */
  abstract canScore(response: PromptResponse): MaybePromise<boolean>;
}
