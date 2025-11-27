import { AbstractScorer } from "@/scorers/abstract/abstract-scorer";
import { PromptResponse } from "@/types";

/**
 * Simple example scorer that checks for keyword presence
 * Demonstrates basic response scoring
 *
 * This scorer shows how to:
 * 1. Extend AbstractScorer with proper typing
 * 2. Implement the required abstract methods
 * 3. Check if a response can be scored by this scorer
 * 4. Score responses based on simple keyword matching
 * 5. Handle edge cases and invalid responses
 * 6. Use options for configurable scoring behavior
 *
 * This is a basic example - real scorers would typically use more sophisticated
 * algorithms like semantic similarity, exact matching, or AI-powered evaluation.
 */
export class ExampleKeywordScorer extends AbstractScorer {
  // Unique identifier for this scorer - used for registration and identification
  readonly identifier = "example-keyword";

  /**
   * Scores a response based on keyword presence
   * This is the main scoring logic that determines how well the response matches expectations
   *
   * @param response - The PromptResponse object containing the model's response and context
   * @param options - Optional configuration for the scoring process
   * @returns Promise<number | undefined> - Score between 0 and 1, or undefined if scoring fails
   *
   * Scoring logic:
   * - Returns 1.0 if any positive keyword is found in the response
   * - Returns 0.0 if no positive keywords are found
   * - Returns undefined if the response cannot be scored
   *
   * This simple approach is useful for:
   * - Binary classification tasks (correct/incorrect)
   * - Sentiment analysis (positive/negative keywords)
   * - Basic content validation
   */
  async scoreOne(
    response: PromptResponse,
    options?: Record<string, any>
  ): Promise<number | undefined> {
    // First check if this scorer can handle the given response
    // This prevents scoring responses that don't meet our requirements
    if (!(await this.canScore(response))) {
      return undefined; // Cannot score this response
    }

    // Extract the response data (the actual text from the model)
    const { data } = response;

    // Double-check that data exists (defensive programming)
    if (!data) {
      return undefined; // No data to score
    }

    // Get keywords from options or use sensible defaults
    // This allows users to customize what keywords indicate a "good" response
    const keywords = options?.keywords || ["correct", "right", "accurate"];

    // Check if any of the positive keywords are present in the response
    // Convert both to lowercase for case-insensitive matching
    const hasKeyword = keywords.some((keyword: string) =>
      data.toLowerCase().includes(keyword.toLowerCase())
    );

    // Return binary score: 1.0 for good responses, 0.0 for others
    // In a real implementation, you might use more nuanced scoring
    return hasKeyword ? 1.0 : 0.0;
  }

  /**
   * Determines whether this scorer can handle the given response
   * This is a critical method that filters which responses get scored
   *
   * @param response - The PromptResponse to evaluate
   * @returns Promise<boolean> - True if this scorer can score the response
   *
   * This method should check:
   * 1. Response has the required data fields
   * 2. Response format is compatible with this scorer
   * 3. Any other prerequisites for scoring
   *
   * Benefits of proper canScore implementation:
   * - Prevents errors from trying to score incompatible responses
   * - Allows multiple scorers to work together (each handles different response types)
   * - Improves performance by filtering responses early
   */
  async canScore(response: PromptResponse): Promise<boolean> {
    // Check that the response has the minimum required data
    // We need both the response data and the original prompt for context
    return response.data !== undefined && response.prompt !== undefined;
  }
}
