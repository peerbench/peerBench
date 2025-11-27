import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptScoreSchema, ScoringMethods } from "@/types";
import tokenizer from "sbd";
import { v7 as uuidv7 } from "uuid";

/**
 * This Scorer splits the given Response and the answer into sentences and checks the similarity between them.
 * For each sentence that is placed correctly in the Response (same position as in the answer) it counts one score.
 * The final score is the ratio of the number of sentences that are placed correctly in the Response to the total number of sentences in the answer.
 * Simply `correctly_placed_sentences / total_sentence_count`. It uses `sbd` library to split the text into sentences.
 */
export class SimilarityScorer extends AbstractScorer {
  readonly identifier = "similarity";

  async scoreOne(response: PromptResponse, options?: { ignoreCase?: boolean }) {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    const originalSentences = options?.ignoreCase
      ? tokenizer.sentences(response.prompt.answer!.toLowerCase())
      : tokenizer.sentences(response.prompt.answer!);
    const responseSentences = options?.ignoreCase
      ? tokenizer.sentences(response.response!.toLowerCase())
      : tokenizer.sentences(response.response!);

    let score = 0;
    for (let i = 0; i < originalSentences.length; i++) {
      const originalSentence = originalSentences[i];
      const responseSentence = responseSentences[i];

      // Count one point for each sentence found in the correct position
      if (originalSentence === responseSentence) {
        score += 1;
      }
    }

    return PromptScoreSchema.parse({
      ...response,
      scoreUUID: uuidv7(),
      // Calculate the accuracy
      score: score / originalSentences.length,
      method: ScoringMethods.algo,
      prompt: response.prompt,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        correctPositionedSentences: score,
        totalSentencesInAnswer: originalSentences.length,
        totalSentencesInResponse: responseSentences.length,
      },
      explanation: undefined,
    });
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return (
      response.response !== undefined &&
      response.prompt !== undefined &&
      response.prompt.answer !== undefined
    );
  }
}
