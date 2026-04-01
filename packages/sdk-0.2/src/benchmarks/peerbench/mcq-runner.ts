import { defineRunner } from "@/helpers/define-runner";
import { CallableLLM } from "@/providers";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import { LLMAsAJudgeScorer, MCQScorer } from "@/scorers";
import { IdGenerator, ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import Handlebars from "handlebars";
import z from "zod";
import {
  MCQResponseSchemaV1,
  MCQScoreSchemaV1,
  MCQTestCaseV1,
} from "./schema-sets/mcq.v1";
import { PEERBENCH_NAMESPACE } from "@/constants";

export const mcqRunner = defineRunner(
  async (params: {
    testCase: MCQTestCaseV1;
    target: CallableLLM;
    scorer?: MCQScorer | LLMAsAJudgeScorer;
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
      content: formatMCQ(testCase),
    });
    templateMessages(messages, params.templateVariables ?? {});

    const providerResponse = await target.forward({ messages });

    const response = await MCQResponseSchemaV1.newWithId(
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

    if (scorer?.kind === (`${PEERBENCH_NAMESPACE}/mcq` as const)) {
      const scorerResult = await scorer.score({
        response: response.data,
        choices: testCase.options,
        correctAnswers: testCase.correctAnswerKeys,
      });

      if (scorerResult !== null) {
        const score = await MCQScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.algo,
            value: scorerResult.value,
            responseId: response.id,
            extractedAnswers: scorerResult.extractedAnswers,
            explanation: scorerResult.explanation,
            metadata: scorerResult.metadata,
          },
          params.idGenerators?.score ?? idGeneratorUUIDv7
        );

        return { response, score };
      }
    }

    if (scorer?.kind === (`${PEERBENCH_NAMESPACE}/llm-as-a-judge` as const)) {
      const scorerResult = await scorer.score({
        criteria: [
          {
            id: "correctness",
            description:
              "Is the given answer key matches with one of the correct answer keys?",
            weight: 1,
          },
        ],
        rubric: `Answer text itself or the key (A, B, C) is accepted
Valid answer keys: ${testCase.correctAnswerKeys.map((key) => `- ${key}`).join("\n")}
Valid Answer texts: ${testCase.correctAnswerKeys.map((key) => `- ${testCase.options?.[key] ?? ""}`).join("\n")}`,
        fieldsToExtract: {
          extractedAnswers: z
            .string()
            .array()
            .describe(
              "The extracted answer keys, valid or invalid (even if the answer text is provided rather than the key)"
            ),
          ...(params.llmJudgeFieldsToExtract ?? {}),
        },
        response: response.data,
        systemPrompt: params.llmJudgeSystemPrompt?.content,
      });

      if (scorerResult !== null) {
        const { extractedAnswers, ...extractedFields } =
          scorerResult.extractedFields;
        const score = await MCQScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.ai,
            value: scorerResult.value,
            extractedAnswers,
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
              extractedFields,
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

function formatMCQ(testCase: MCQTestCaseV1) {
  return `Question: ${testCase.question}\nOptions:\n${Object.entries(
    testCase.options ?? {}
  )
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}`;
}

function templateMessages(
  messages: ChatCompletionMessageParam[],
  templateVariables: Record<string, string>
) {
  for (let i = 0; i < messages.length; i++) {
    const template = Handlebars.compile(messages[i]!.content);
    messages[i]!.content = template(templateVariables);
  }
}
