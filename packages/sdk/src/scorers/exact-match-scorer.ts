import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptScoreSchema, ScoringMethods } from "@/types";
import { v7 as uuidv7 } from "uuid";

/**
 * It can be used both for multiple choice and free form questions.
 * If the Prompt includes options (aka it is multiple choice question) then
 * compares the `answerKey` field with the response and checks if they are the same.
 * Otherwise uses `answer` field for the same thing.
 */
export class ExactMatchScorer extends AbstractScorer {
  readonly identifier = "exact-match";

  async scoreOne(response: PromptResponse) {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    let score = 0;

    // Use `answerKey` field for multiple choice questions
    // (If a Prompt has options, then it is a multiple choice question)
    if (
      response.prompt.options !== undefined &&
      Object.keys(response.prompt.options).length > 0
    ) {
      score =
        response.response?.trim() === response.prompt.answerKey?.trim() ? 1 : 0;
    } else {
      // Use `answer` field
      score =
        response.response?.trim() === response.prompt.answer?.trim() ? 1 : 0;
    }

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreUUID: uuidv7(),
      method: ScoringMethods.algo,
      prompt: response.prompt,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        extractedAnswer: response.response?.trim(),
      },
      explanation: undefined,
    });
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return response.response !== undefined && response.prompt !== undefined;
  }
}
