import { z } from "zod";
import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptScoreSchema, ScoringMethods } from "@/types";
import { BaseLLMProvider, OpenRouterProvider } from "@/providers";
import { parseResponseAsJSON } from "@/utils/llm";
import { formatString } from "@/utils";
import { debugLog } from "@/utils/debug";
import { v7 as uuidv7 } from "uuid";
/**
 * A Scorer which uses an LLM model to judge the response quality against the correct answer.
 * Provides continuous scoring from 0.0 to 1.0 based on how close the answer is to being correct.
 * @deprecated Use `LLMJudgeScorer` instead
 */
export class RefAnswerQualityLLMJudgeScorer extends AbstractScorer {
  readonly identifier = "ref-answer-quality-llm-judge-scorer";

  optionsSchema = z
    .object({
      openRouterApiKey: z.string().optional(),
      provider: z.instanceof(BaseLLMProvider).optional(),
      model: z.string(),
      prompt: z.string().default(`
Evaluate the quality of the following [response] to [question] based on the [correctAnswer] OR [correctAnswerKey] (if the question was a multiple choice question) below.

[question]: {question}

[response]: {response}

[correctAnswer]: {correctAnswer}
[correctAnswerKey]: {correctAnswerKey}

Your evaluation must be in the format and criteria specified below:
\`\`\`json
{
  "extractedFinalAnswer": "The final exact answer extracted from the [response]. Put the extracted answer as 'None' if there is no exact, final answer to extract from the response.",
  "reasoning": "Explain the quality of the response, considering: 1) How close the answer is to the correct answer, 2) The clarity and completeness of the explanation, 3) Any errors or misconceptions, 4) The overall helpfulness and accuracy. Be specific about what makes the response good or bad.",
  "qualityScore": "A numerical score between 0.0 and 1.0 representing the overall quality of the response. Use this scale: 1.0 = Perfect answer with excellent explanation, 0.8-0.9 = Correct answer with good explanation, 0.6-0.7 = Mostly correct with minor issues, 0.4-0.5 = Partially correct with some errors, 0.2-0.3 = Mostly incorrect but some relevant content, 0.0-0.1 = Completely wrong or irrelevant.",
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
        correctAnswer:
          response.prompt.answer ?? "CORRECT ANSWER IS NOT AVAILABLE",
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
      qualityScore: string;
      extractedFinalAnswer: string;
      reasoning: string;
      confidence: string;
    }>(judge.data);
    debugLog("Extracted JSON from Quality Judge response:", extractedJSON);
    debugLog("-------------------------------------");

    let score = 0;
    if (extractedJSON && typeof extractedJSON === "object") {
      // Parse the quality score as a float
      const qualityScore = parseFloat(extractedJSON.qualityScore);
      if (!isNaN(qualityScore)) {
        // Ensure the score is between 0 and 1
        score = Math.max(0, Math.min(1, qualityScore));
      }
    }

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreUUID: uuidv7(),
      prompt: response.prompt,
      method: ScoringMethods.ai,
      scorerAIProvider: provider.identifier,
      scorerAIModelSlug: parsedOptions.model,
      scorerAIInputTokensUsed: judge.inputTokensUsed,
      scorerAIOutputTokensUsed: judge.outputTokensUsed,
      scorerAIInputCost: judge.inputCost,
      scorerAIOutputCost: judge.outputCost,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        extractedAnswer: extractedJSON?.extractedFinalAnswer,
        reasoning: extractedJSON?.reasoning,
        qualityScore: extractedJSON?.qualityScore,
        confidence: extractedJSON?.confidence,
      },
      explanation: extractedJSON?.reasoning ?? undefined,
    });
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return response.response !== undefined && response.prompt !== undefined;
  }
}
