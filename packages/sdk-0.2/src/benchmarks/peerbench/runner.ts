import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { idGeneratorUUIDv7 } from "@/utils/id-generator";
import { IdGenerator, RunnerResult } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { MCQScorer } from "@/scorers/mcq";
import { LLMJudgeScorer } from "@/scorers/llm-judge";
import {
  PeerbenchMultipleChoiceResponseSchemaV1,
  PeerbenchMultipleChoiceResponseV1,
  PeerbenchMultipleChoiceScoreSchemaV1,
  PeerbenchMultipleChoiceScoreV1,
  PeerbenchMultipleChoiceTestCaseV1,
} from "./test-cases/mcq.v1";
import { ScoringMethod } from "@/types";
import {
  PeerbenchOpenEndedResponseSchemaV1,
  PeerbenchOpenEndedResponseV1,
  PeerbenchOpenEndedScoreSchemaV1,
  PeerbenchOpenEndedScoreV1,
  PeerbenchOpenEndedTestCaseV1,
} from "./test-cases/open-ended.v1";
import { PeerbenchBenchmarkSpecV1 } from "./spec";
import { SimpleSystemPromptV1 } from "@/schemas/llm";

type ResponseTypes =
  | PeerbenchMultipleChoiceResponseV1
  | PeerbenchOpenEndedResponseV1;
type ScoreTypes = PeerbenchMultipleChoiceScoreV1 | PeerbenchOpenEndedScoreV1;
type TestCaseTypes =
  | PeerbenchMultipleChoiceTestCaseV1
  | PeerbenchOpenEndedTestCaseV1;

export async function runTestCase(params: {
  testCase: TestCaseTypes;
  provider: AbstractLLMProvider;
  scorer?: MCQScorer | LLMJudgeScorer;
  spec?: PeerbenchBenchmarkSpecV1;
  runConfig: {
    model: string;
    llmJudgeModel?: string;
  };
  systemPrompt?: SimpleSystemPromptV1;
  idGenerators?: {
    response?: IdGenerator;
    score?: IdGenerator;
  };
}): Promise<RunnerResult<ResponseTypes, ScoreTypes>> {
  const { testCase } = params;
  const responseIdGenerator =
    params.idGenerators?.response ?? idGeneratorUUIDv7;
  const scoreIdGenerator = params.idGenerators?.score ?? idGeneratorUUIDv7;
  const messages: ChatCompletionMessageParam[] = [];

  if (params.systemPrompt) {
    messages.push({
      role: "system",
      content: params.systemPrompt.content,
    });
  }

  if (testCase.kind === "pb.ts.mcq") {
    const formattedPrompt = formatMCQPrompt(testCase);

    messages.push({
      role: "user",
      content: formattedPrompt,
    });

    const providerResponse = await params.provider.forward({
      model: params.runConfig.model,
      messages,
    });

    const response = await PeerbenchMultipleChoiceResponseSchemaV1.newWithId(
      {
        data: providerResponse.data,
        startedAt: providerResponse.startedAt,
        completedAt: providerResponse.completedAt,
        testCaseId: testCase.id,
        modelSlug: params.runConfig.model,
        provider: params.provider.kind,

        inputTokensUsed: providerResponse.inputTokensUsed,
        outputTokensUsed: providerResponse.outputTokensUsed,
        inputCost: providerResponse.inputCost,
        outputCost: providerResponse.outputCost,
      },
      responseIdGenerator
    );

    if (params.scorer?.kind === "mcq") {
      const scorerResult = await params.scorer.score({
        response: response.data,
        choices: testCase.options ?? {},
        correctAnswers: [testCase.answerKey],
      });

      if (scorerResult !== null) {
        const score = await PeerbenchMultipleChoiceScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.algo,
            value: scorerResult.value,
            responseId: response.id,
            extractedAnswers: scorerResult.extractedAnswers,
            metadata: response.metadata,
          },
          scoreIdGenerator
        );

        return { response, score };
      }
    }

    return { response };
  } else if (testCase.kind === "pb.ts.open-ended") {
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

    const providerResponse = await params.provider.forward({
      model: params.runConfig.model,
      messages,
    });

    const response = await PeerbenchOpenEndedResponseSchemaV1.newWithId(
      {
        data: providerResponse.data,
        startedAt: providerResponse.startedAt,
        completedAt: providerResponse.completedAt,
        testCaseId: testCase.id,
        modelSlug: params.runConfig.model,
        provider: params.provider.kind,

        inputTokensUsed: providerResponse.inputTokensUsed,
        outputTokensUsed: providerResponse.outputTokensUsed,
        inputCost: providerResponse.inputCost,
        outputCost: providerResponse.outputCost,
      },
      responseIdGenerator
    );

    if (params.scorer?.kind === "llmJudge" && params.runConfig.llmJudgeModel) {
      const scorerResult = await params.scorer.score({
        task: testCase.question,
        candidateAnswer: response.data,
        referenceAnswer: testCase.answer,
        model: params.runConfig.llmJudgeModel,
      });

      if (scorerResult !== null) {
        const score = await PeerbenchOpenEndedScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.ai,
            value: scorerResult.value,
            responseId: response.id,
            explanation: scorerResult.explanation,
            metadata: scorerResult.metadata,

            scorerAIProvider: scorerResult.provider,
            scorerAIModelSlug: params.runConfig.llmJudgeModel,
            scorerAIInputTokensUsed: scorerResult.inputTokensUsed,
            scorerAIOutputTokensUsed: scorerResult.outputTokensUsed,
            scorerAIInputCost: scorerResult.inputCost,
            scorerAIOutputCost: scorerResult.outputCost,
          },
          scoreIdGenerator
        );

        return { response, score };
      }
    }

    return { response };
  }

  throw new Error("Unsupported test case kind");
}

function formatMCQPrompt(testCase: PeerbenchMultipleChoiceTestCaseV1) {
  return `Question: ${testCase.question}\nOptions:\n${Object.entries(
    testCase.options ?? {}
  )
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}`;
}
