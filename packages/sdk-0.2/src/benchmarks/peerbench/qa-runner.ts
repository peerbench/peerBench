import { defineRunner } from "@/helpers/define-runner";
import { CallableLLM } from "@/providers";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import { LLMAsAJudgeScorer } from "@/scorers";
import { IdGenerator, ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import Handlebars from "handlebars";
import z from "zod";
import {
  QAResponseSchemaV1,
  QAScoreSchemaV1,
  QATestCaseV1,
} from "./schema-sets/qa.v1";
import { PEERBENCH_NAMESPACE } from "@/constants";

export const qaRunner = defineRunner(
  async (params: {
    testCase: QATestCaseV1;
    target: CallableLLM;
    scorer?: LLMAsAJudgeScorer;
    systemPrompt?: SimpleSystemPromptV1;
    llmJudgeSystemPrompt?: SimpleSystemPromptV1;
    llmJudgeFieldsToExtract?: Record<string, z.ZodType>;
    templateVariables?: Record<string, string>;
    idGenerators?: {
      response?: IdGenerator;
      score?: IdGenerator;
    };
  }) => {
    const { testCase, target, scorer } = params;
    const messages: ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      messages.push({
        role: "system",
        content: params.systemPrompt.content,
      });
    }

    messages.push({
      role: "user",
      content: testCase.question,
    });
    templateMessages(messages, params.templateVariables ?? {});

    const providerResponse = await target.forward({ messages });

    const response = await QAResponseSchemaV1.newWithId(
      {
        data: providerResponse.data,
        startedAt: providerResponse.startedAt,
        completedAt: providerResponse.completedAt,
        testCaseId: testCase.id,
        modelSlug: target.slug,
        provider: target.provider.kind,
        systemPromptId: params.systemPrompt?.id,
        inputTokensUsed: providerResponse.inputTokensUsed,
        outputTokensUsed: providerResponse.outputTokensUsed,
        inputCost: providerResponse.inputCost,
        outputCost: providerResponse.outputCost,
      },
      params.idGenerators?.response ?? idGeneratorUUIDv7
    );

    if (scorer?.kind === (`${PEERBENCH_NAMESPACE}/llm-as-a-judge` as const)) {
      const scorerResult = await scorer.score({
        response: response.data,
        rubric: `Expected/Valid answers: ${testCase.goodAnswers.join("\n")}\nInvalid answers: ${testCase.badAnswers.join("\n")}`,
        systemPrompt: params.llmJudgeSystemPrompt?.content,
        criteria: [
          {
            id: "correctness",
            description:
              "Is the response matches with the expected/valid answers in terms of meaning?",
            weight: 1,
          },
        ],
        fieldsToExtract: params.llmJudgeFieldsToExtract ?? {},
      });

      if (scorerResult !== null) {
        const score = await QAScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.ai,
            value: scorerResult.value,
            responseId: response.id,
            explanation: scorerResult.explanation,
            scorerAIInputCost: scorerResult.inputCost,
            scorerAIOutputCost: scorerResult.outputCost,
            scorerAIInputTokensUsed: scorerResult.inputTokensUsed,
            scorerAIOutputTokensUsed: scorerResult.outputTokensUsed,
            scorerAIProvider: scorerResult.provider,
            scorerAIModelSlug: scorerResult.modelSlug,
            scorerAISystemPromptId: params.llmJudgeSystemPrompt?.id,
            metadata: {
              ...scorerResult.metadata,
              extractedFields: scorerResult.extractedFields,
            },
          },
          params.idGenerators?.score ?? idGeneratorUUIDv7
        );

        return { response, score };
      }
    }

    return { response };
  }
);

function templateMessages(
  messages: ChatCompletionMessageParam[],
  templateVariables: Record<string, string>
) {
  for (let i = 0; i < messages.length; i++) {
    const template = Handlebars.compile(messages[i]!.content);
    messages[i]!.content = template(templateVariables);
  }
}
