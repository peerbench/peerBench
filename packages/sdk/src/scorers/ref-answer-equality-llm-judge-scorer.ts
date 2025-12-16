import { z } from "zod";
import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptScoreSchema, ScoringMethods } from "@/types";
import { BaseLLMProvider, OpenRouterProvider } from "@/providers";
import { parseResponseAsJSON } from "@/utils/llm";
import { formatString } from "@/utils";
import { debugLog } from "@/utils/debug";
import { v7 as uuidv7 } from "uuid";

/**
 * A Scorer which uses an LLM model to judge the response against the correct answer.
 * @deprecated Use `LLMJudgeScorer` instead
 */
export class RefAnswerEqualityLLMJudgeScorer extends AbstractScorer {
  readonly identifier = "ref-answer-equality-llm-judge-scorer";

  optionsSchema = z
    .object({
      openRouterApiKey: z.string().optional(),
      provider: z.instanceof(BaseLLMProvider).optional(),
      model: z.string(),
      prompt: z.string().default(`
Judge whether the following [response] to [question] is correct or not based on the precise and unambiguous [correctAnswer] OR [correctAnswerKey] (if the question was a multiple choice question) below.

[question]: {question}

[response]: {response}

[correctAnswer]: {correctAnswer}
[correctAnswerKey]: {correctAnswerKey}

Your judgement must be in the format and criteria specified below:
\`\`\`json
{
  "extractedFinalAnswer": "The final exact answer extracted from the [response]. Put the extracted answer as 'None' if there is no exact, final answer to extract from the response.",
  "reasoning": "Explain why the extractedFinalAnswer is correct or incorrect based on [correctAnswer], focusing only on if there are meaningful differences between [correctAnswer] and the extractedFinalAnswer. Do not comment on any background to the problem, do not attempt to solve the problem, do not argue for any answer different than [correctAnswer], focus only on whether the answers match.",
  "correct": "Answer 'yes' if extracted_final_answer matches the [correctAnswer] given above, or is within a small margin of error for numerical problems. Answer 'no' otherwise, i.e. if there if there is any inconsistency, ambiguity, non-equivalency, or if the extracted answer is incorrect.",
  "confidence": "The extracted confidence score between 0% and 100% from [response]. Put 100 if there is no confidence score available."
}
\`\`\``),
      promptSuffix: z.string().default(""),
      promptPrefix: z.string().default(""),
    })
    .transform((options, ctx) => {
      if (options.provider !== undefined) {
        return options;
      }

      if (options.openRouterApiKey !== undefined) {
        return {
          ...options,
          provider: new OpenRouterProvider({
            apiKey: options.openRouterApiKey,
          }),
        };
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No provider or openRouterApiKey provided",
      });

      return z.NEVER;
    });

  async scoreOne(
    response: PromptResponse,
    options: z.input<typeof this.optionsSchema>
  ) {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    const parsedOptions = this.optionsSchema.parse(options);
    const provider =
      options?.provider ??
      new OpenRouterProvider({
        apiKey: parsedOptions.openRouterApiKey!,
      });

    // Build the prompt
    const prompt = formatString(
      parsedOptions.promptPrefix +
        parsedOptions.prompt +
        parsedOptions.promptSuffix,
      {
        question: response.prompt.prompt,
        response: response.response!,
        correctAnswer: response.prompt.answer!,
        correctAnswerKey:
          // If the Prompt is a multiple choice question, then the model might have answered
          // with the correct answer key rather than the actual answer text so consider that
          // the answer key is also the correct answer
          response.prompt.answerKey || "CORRECT ANSWER KEY IS NOT AVAILABLE",
      }
    );

    const judge = await provider.forward(prompt, {
      model: parsedOptions.model,
    });

    const extractedJSON = parseResponseAsJSON<{
      correct: string;
      extractedFinalAnswer: string;
      reasoning: string;
      confidence: string;
    }>(judge.data);
    debugLog("Extracted JSON from Judge response:", extractedJSON);
    debugLog("-------------------------------------");

    let score = 0;
    if (extractedJSON && typeof extractedJSON === "object") {
      score = extractedJSON.correct.toLowerCase() === "yes" ? 1 : 0;
    }

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreUUID: uuidv7(),
      prompt: response.prompt,
      method: ScoringMethods.ai,
      scorerAIProvider: provider.getIdentifier(),
      scorerAIModelSlug: parsedOptions.model,
      scorerAIInputTokensUsed: judge.inputTokensUsed,
      scorerAIOutputTokensUsed: judge.outputTokensUsed,
      scorerAIInputCost: judge.inputCost,
      scorerAIOutputCost: judge.outputCost,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        extractedAnswer: extractedJSON?.extractedFinalAnswer,
        reasoning: extractedJSON?.reasoning,
        confidence: extractedJSON?.confidence,
      },
      explanation: extractedJSON?.reasoning ?? undefined,
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
