import { parseResponseAsJSON } from "@/utils";
import { AbstractScorer, BaseScorerResult } from "./abstract";
import { RegexScorer, RegexPattern, RegexScorerParams } from "./regex";
import { PEERBENCH_NAMESPACE } from "@/constants";

export type MCQScorerParams = {
  response: string;
  choices: Record<string, string>;
  correctAnswers: string[];
};

export class MCQScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/mcq`
) {
  private regexScorer = new RegexScorer();

  async score(params: MCQScorerParams): Promise<
    BaseScorerResult & {
      extractedAnswers: string[];
    }
  > {
    const { response, choices, correctAnswers } = params;
    const normalizedCorrectAnswers = correctAnswers.map((ca) =>
      ca.toUpperCase()
    );

    // Direct answer comparison
    const normalizedResponse = response.trim().toUpperCase();
    if (normalizedCorrectAnswers.includes(normalizedResponse)) {
      return {
        value: 1,
        extractedAnswers: [normalizedResponse],
      };
    }

    // Try to parse the response as JSON (original behavior: returns early if parsed)
    const json = parseResponseAsJSON<{ answer: string }>(response);
    if (json !== undefined && typeof json === "object") {
      const extractedAnswer =
        json.answer !== undefined ? getFirstLetter(json.answer) : undefined;

      if (extractedAnswer !== undefined) {
        const normalizedExtracted = extractedAnswer.trim().toUpperCase();
        if (normalizedCorrectAnswers.includes(normalizedExtracted)) {
          return {
            value: 1,
            extractedAnswers: [extractedAnswer],
          };
        }

        // Response parsed as JSON but does not represent the correct answer
        return {
          value: 0,
          extractedAnswers:
            json.answer === undefined
              ? []
              : [extractedAnswer ?? String(json.answer)],
        };
      }
    }

    // Build patterns for all correctAnswers
    const patterns: RegexPattern[] = [];
    for (const answer of Object.values(params.choices)) {
      const answerPatterns = this.buildPatternsForAnswer(answer);
      patterns.push(...answerPatterns);
    }

    // Create validation function that handles choices matching
    // New RegexScorer API expects (groupName: string, match: string) => boolean
    const validateAnswer = (groupName: string, extracted: string): boolean => {
      const normalizedExtracted = extracted.trim().toUpperCase();

      // Check if extracted value is in correctAnswers
      if (normalizedCorrectAnswers.includes(normalizedExtracted)) {
        return true;
      }

      // Check if extracted text matches any choice value, and that choice key is correct
      // Note: When transform uppercases the value, we need to compare case-insensitively
      const answerOption = Object.entries(choices).find(
        ([, value]) =>
          value.trim().toUpperCase() === extracted.trim().toUpperCase()
      );

      if (
        answerOption &&
        normalizedCorrectAnswers.includes(answerOption[0].toUpperCase())
      ) {
        return true;
      }

      return false;
    };

    // Build regex scorer params
    const regexParams: RegexScorerParams = {
      input: response,
      patterns,
      expectedValue: validateAnswer,
      matchPreference: "last",
    };

    // Call regex scorer
    const result = await this.regexScorer.score(regexParams);

    return {
      value: result.value,
      extractedAnswers: Object.entries(result.extractedAnswers).map(
        ([, value]) => value
      ),
    };
  }

  private buildPatternsForAnswer(answerText: string): RegexPattern[] {
    const escapedAnswer = escapeRegex(answerText);

    return [
      {
        // "<!NO ANSWER!>" - This pattern matches but has no capture group, so it won't extract anything
        regex: /<!NO ANSWER!>/g,
      },
      // Specific patterns for the full answer text (checked first)
      {
        // "Answer is $\boxed{answer text}$"
        regex: new RegExp(
          `[Aa]nswer is \\$\\\\boxed\\{(?<answer>${escapedAnswer})\\}\\$`,
          "g"
        ),
        transform: (value: string) => value.toUpperCase(),
      },
      {
        // "Answer is answer text"
        regex: new RegExp(`[Aa]nswer is\\s+(?<answer>${escapedAnswer})`, "g"),
        transform: (value: string) => value.toUpperCase(),
      },
      {
        // "Answer is **answer text**"
        regex: new RegExp(
          `[Aa]nswer is\\s+\\**(?<answer>${escapedAnswer})\\**`,
          "g"
        ),
        transform: (value: string) => value.toUpperCase(),
      },
      // Generic patterns (checked after specific patterns)
      {
        // "Answer is $\boxed{A}$."
        regex: /[Aa]nswer is \$\\boxed\{(?<answer>[A-Z])\}\$\.?/g,
      },
      {
        // "Answer is A" - match single letter only when it's a complete standalone answer.
        // Pattern matches: "Answer is" + whitespace + single letter + end or punctuation
        regex: /[Aa]nswer is\s+(?<answer>[A-Z])(?=\s*$|[.,;:!?])/g,
      },
      {
        // "Answer is **A**"
        regex: /[Aa]nswer is\s+\**(?<answer>[A-Z])\**/g,
      },
      {
        // "A: answer text"
        regex: /(?<answer>[A-Z]):.+/g,
      },
      {
        // "A) answer text"
        regex: /(?<answer>[A-Z])\)\s*.+/g,
      },
      {
        // "A)"
        regex: /(?<answer>[A-Z])\)/g,
      },
    ];
  }
}

function getFirstLetter(text: string): string | undefined {
  const match = text.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
