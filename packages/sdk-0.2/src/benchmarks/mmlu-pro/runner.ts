import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { idGeneratorUUIDv7 } from "@/utils/id-generator";
import { IdGenerator, RunnerResult } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { MCQScorer } from "@/scorers/mcq";
import { LLMJudgeScorer } from "@/scorers/llm-judge";
import { ScoringMethod } from "@/types";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import {
  MMLUProMainResponseV1,
  MMLUProMainTestCaseV1,
  MMLUProMainScoreV1,
  MMLUProMainResponseSchemaV1,
  MMLUProMainScoreSchemaV1,
} from "./test-cases/main.v1";
import { MMLUProBenchmarkSpecV1 } from "./spec";

export async function runTestCase(params: {
  testCase: MMLUProMainTestCaseV1;
  provider: AbstractLLMProvider;
  scorer?: MCQScorer | LLMJudgeScorer;
  spec?: MMLUProBenchmarkSpecV1;
  runConfig: {
    model: string;
    llmJudgeModel?: string;
  };
  systemPrompt?: SimpleSystemPromptV1;
  idGenerators?: {
    response?: IdGenerator;
    score?: IdGenerator;
  };
}): Promise<RunnerResult<MMLUProMainResponseV1, MMLUProMainScoreV1>> {
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

  if (testCase.kind === "mmlu-pro.ts.main") {
    const formattedPrompt = formatMCQPrompt(testCase);

    messages.push({
      role: "user",
      content: formattedPrompt,
    });

    const providerResponse = await params.provider.forward({
      model: params.runConfig.model,
      messages,
    });

    const response = await MMLUProMainResponseSchemaV1.newWithId(
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
        const score = await MMLUProMainScoreSchemaV1.newWithId(
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

    const response = await MMLUProMainResponseSchemaV1.newWithId(
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
        const score = await MMLUProMainScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.ai,
            value: scorerResult.value,
            responseId: response.id,
            explanation: scorerResult.explanation,
            metadata: scorerResult.metadata,
            extractedAnswers: [],

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

function formatMCQPrompt(testCase: MMLUProMainTestCaseV1) {
  return `Question: ${testCase.question}\nOptions:\n${Object.entries(
    testCase.options ?? {}
  )
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}`;
}
