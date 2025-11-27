import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptScoreSchema, ScoringMethods } from "@/types";
import { parseResponseAsJSON } from "@/utils";
import { v7 as uuidv7 } from "uuid";

export class MultipleChoiceScorer extends AbstractScorer {
  readonly identifier = "multiple-choice";

  private readonly EXPLANATION_TEXT = `This scorer searches for multiple choice answers using the following methods (in order):
1) Attempts to directly compare the response text with the expected answer letter,
2) Tries to parse the response as a JSON object and extract the answer from "answer" field (e.g. {"answer": "A"}),
3) Pattern matching using the following patterns:
   a) "<!NO ANSWER!>" (special marker indicating model's inability to answer),
   b) "Answer is $\\boxed{answer text}$" (full answer text in LaTeX boxed format),
   c) "Answer is answer text" (full answer text),
   d) "Answer is **answer text**" (full answer text in bold),
   e) "Answer is $\\boxed{A}$" or "Answer is $\\boxed{A}$." (single letter in LaTeX boxed format, optional period),
   f) "Answer is A" (single letter),
   g) "Answer is **A**" (single letter in bold),
   h) "A: ..." (letter followed by colon),
   i) "A) ..." (letter followed by closing parenthesis and optional text),
   j) "A)" (letter followed by closing parenthesis),
4) Answer text matching: if the extracted answer matches one of the option texts, the corresponding option key is used.
The scorer extracts the answer from the last matching pattern (if multiple matches exist) and compares it with the expected answer key (or the answer text itself).`;

  /**
   * Score a multiple choice response
   */
  async scoreOne(response: PromptResponse) {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    const { extractedAnswer, score } = this.calculateScore(response);

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreUUID: uuidv7(),
      method: ScoringMethods.algo,
      prompt: response.prompt,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        extractedAnswer,
      },
      explanation: this.EXPLANATION_TEXT,
    });
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return (
      response.response !== undefined &&
      response.prompt !== undefined &&
      // TODO: Enable this condition once we are sure the structure of the Prompt and whether to include the type in there
      // response.prompt.type === PromptTypes.MultipleChoice &&
      response.prompt.options !== undefined &&
      Object.keys(response.prompt.options).length > 0 &&
      Boolean(response.prompt.answerKey) && // not undefined or empty string
      Boolean(response.prompt.answer) // not undefined or empty string
    );
  }

  /**
   * Tries all the possible ways to score the response and returns the final score.
   */
  private calculateScore(response: PromptResponse) {
    const { response: data, prompt } = response;

    // Direct answer comparison
    if (data.trim().toUpperCase() === prompt.answerKey?.trim().toUpperCase()) {
      return {
        extractedAnswer: data.trim().toUpperCase(),
        score: 1,
      };
    }

    // Try to parse the response as the expected JSON object
    const json = parseResponseAsJSON<{ answer: string }>(data!);
    if (json !== undefined) {
      // Check if the parsed JSON object represents the correct answer
      if (
        json.answer !== undefined &&
        json.answer.trim().toUpperCase() ===
          prompt.answerKey?.trim().toUpperCase()
      ) {
        return {
          extractedAnswer: json.answer.toUpperCase(),
          score: 1,
        };
      }

      // Response parsed as JSON but does not represent the correct answer
      return {
        extractedAnswer:
          json.answer === undefined ? null : String(json.answer).toUpperCase(),
        score: 0,
      };
    }
    // Look for answer patterns in the response
    const extractedAnswer = this.lookForAnswer(data!, prompt.answerKey!);
    if (extractedAnswer === prompt.answerKey) {
      return {
        extractedAnswer,
        score: 1,
      };
    }

    // The model might have answered with the answer text
    // itself rather than the answer key. In this case, we need to
    // find the answer's letter that matches the answer text.
    const answerOption = Object.entries(prompt.options!).find(
      ([, value]) => value.trim() === extractedAnswer?.trim()
    );

    // Check if the given text is one of the available options
    // and it is the correct one.
    if (answerOption && answerOption[0] === prompt.answerKey) {
      return {
        extractedAnswer: answerOption[0],
        score: 1,
      };
    }

    return {
      score: 0,
    };
  }

  /**
   * Extracts answer from Response text using regex patterns
   */
  private lookForAnswer(response: string, answer: string): string | undefined {
    /**
     * Patterns from most specific to least
     */
    const patterns = [
      {
        // "<!NO ANSWER!>"
        regex: /<!NO ANSWER!>/g,

        // Pattern matches, but no group is specified in the regex.
        // So the final value will be `undefined`.
        answerGroupIndex: 1,
      },
      {
        // "Answer is $\boxed{answer text}$"
        regex: new RegExp(
          `[Aa]nswer is \\$\\\\boxed\\{(${this.escapeRegex(answer)})\\}\\$`,
          "g"
        ),
        answerGroupIndex: 1,
      },
      {
        // "Answer is answer text"
        regex: new RegExp(`[Aa]nswer is\\s+(${this.escapeRegex(answer)})`, "g"),
        answerGroupIndex: 1,
      },
      {
        // "Answer is **answer text**"
        regex: new RegExp(
          `[Aa]nswer is\\s+\\**(${this.escapeRegex(answer)})\\**`,
          "g"
        ),
        answerGroupIndex: 1,
      },
      {
        // "Answer is $\boxed{A}$."
        regex: /[Aa]nswer is \$\\boxed\{([A-Z])\}\$\.?/g,
        answerGroupIndex: 1,
      },
      {
        // "Answer is A"
        regex: /[Aa]nswer is\s+([A-Z])/g,
        answerGroupIndex: 1,
      },
      {
        // "Answer is **A**"
        regex: /[Aa]nswer is\s+\**([A-Z])\**/g,
        answerGroupIndex: 1,
      },
      {
        // "A: answer text"
        regex: /([A-Z]):.+/g,
        answerGroupIndex: 1,
      },
      {
        // "A) answer text"
        regex: /([A-Z])\)\s*.+/g,
        answerGroupIndex: 1,
      },
      {
        // "A)"
        regex: /([A-Z])\)/g,
        answerGroupIndex: 1,
      },
    ];

    for (const pattern of patterns) {
      const matches = Array.from(response.matchAll(pattern.regex));
      const match = matches.at(-1); // Use the last match

      if (match) {
        return match[pattern.answerGroupIndex];
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
