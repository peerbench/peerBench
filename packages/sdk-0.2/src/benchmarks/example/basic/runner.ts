import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { SimpleSystemPromptV1 } from "@/schemas/llm/simple-system-prompt";
import { idGeneratorUUIDv7 } from "@/utils/id-generator";
import { IdGenerator, RunnerResult, ScoringMethod } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { LLMJudgeScorer } from "@/scorers/llm-judge";
import { ExampleBenchmarkSpecV1 } from "./spec";
import { ExampleExactMatchScorer } from "./scorer";
import {
  ExampleEchoResponseSchemaV1,
  ExampleEchoScoreSchemaV1,
  ExampleEchoTestCaseV1,
  ExampleEchoResponseV1,
  ExampleEchoScoreV1,
} from "./test-cases/echo.v1";

/**
 * Runner is the execution part of a benchmark. It takes a test case and produces a response entity.
 * In a typical benchmark flow, runner sits between schemas and providers:
 *
 * - Schemas define how test cases/responses/scores look like (data contract).
 * - Provider is responsible for talking with a model backend.
 * - Runner is responsible for:
 *   1) formatting the test case into a provider request (here it is OpenAI-style `messages[]`),
 *   2) calling `provider.forward(...)`,
 *   3) mapping provider output into a response entity (including `testCaseId`),
 *   4) optionally scoring and producing a score entity (including `responseId`).
 *
 * This runner also demonstrates how a single runner can support multiple scorer implementations.
 * We are doing that by checking `scorer.kind` and calling the right scoring flow.
 *
 * Managing how runners are orchestrated across multiple test cases (parallelism, retries, persistence)
 * are the host application's responsibility.
 */
export async function runTestCase(params: {
  testCase: ExampleEchoTestCaseV1;
  provider: AbstractLLMProvider;
  scorer?: ExampleExactMatchScorer | LLMJudgeScorer;
  runConfig: {
    model: string;
    temperature?: number;
    llmJudgeModel?: string;
  };
  benchmarkSpec?: ExampleBenchmarkSpecV1;
  systemPrompt?: SimpleSystemPromptV1;
  idGenerators?: {
    response?: IdGenerator;
    score?: IdGenerator;
  };
}): Promise<RunnerResult<ExampleEchoResponseV1, ExampleEchoScoreV1>> {
  const responseIdGenerator =
    params.idGenerators?.response ?? idGeneratorUUIDv7;
  const scoreIdGenerator = params.idGenerators?.score ?? idGeneratorUUIDv7;

  // Convert the test case into provider-friendly request. For chat LLMs this is `messages[]`.
  const messages: ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt.content });
  }

  // Benchmark spec is an optional object that can be stored along with the dataset/run.
  // In this benchmark we use it as a prompt wrapper (prefix/suffix).
  const promptPrefix = params.benchmarkSpec?.promptPrefix ?? "";
  const promptSuffix = params.benchmarkSpec?.promptSuffix ?? "";

  messages.push({
    role: "user",
    content:
      `${promptPrefix}\n` +
      `Instruction: ${params.testCase.instruction}\n` +
      `Input:\n${params.testCase.input}\n\n` +
      `Return ONLY the final output string.\n` +
      `${promptSuffix}`.trim(),
  });

  const providerResponse = await params.provider.forward({
    model: params.runConfig.model,
    temperature: params.runConfig.temperature,
    messages,
  });

  // Map provider output into a response entity. Response points to its test case via `testCaseId`.
  const response = await ExampleEchoResponseSchemaV1.newWithId(
    {
      data: providerResponse.data,
      startedAt: providerResponse.startedAt,
      completedAt: providerResponse.completedAt,
      testCaseId: params.testCase.id,
      modelSlug: params.runConfig.model,
      provider: params.provider.kind,
      inputTokensUsed: providerResponse.inputTokensUsed,
      outputTokensUsed: providerResponse.outputTokensUsed,
      inputCost: providerResponse.inputCost,
      outputCost: providerResponse.outputCost,
    },
    responseIdGenerator
  );

  // Scoring is optional. If a scorer is provided, runner is responsible for turning scorer output into a score entity.
  if (params.scorer?.kind === "example.exactMatch") {
    const scorerResult = await params.scorer.score({
      expected: params.testCase.expectedOutput,
      actual: response.data,
    });

    const score = await ExampleEchoScoreSchemaV1.newWithId(
      {
        responseId: response.id,
        value: scorerResult.value,
        explanation: scorerResult.explanation,
        metadata: scorerResult.metadata,
        scoringMethod: ScoringMethod.algo,
        match: Boolean(scorerResult.metadata?.match),
        normalized:
          typeof scorerResult.metadata?.normalize === "boolean"
            ? {
                expected: params.testCase.expectedOutput.trim(),
                actual: response.data.trim(),
              }
            : undefined,
      },
      scoreIdGenerator
    );
    return { response, score };
  }

  if (params.scorer?.kind === "llmJudge" && params.runConfig.llmJudgeModel) {
    // LLM judge scorer uses another model to score. It is slower/costly but useful when scoring is semantic.
    const scorerResult = await params.scorer.score({
      task: params.testCase.instruction,
      candidateAnswer: response.data,
      referenceAnswer: params.testCase.expectedOutput,
      model: params.runConfig.llmJudgeModel,
    });

    if (scorerResult !== null) {
      const score = await ExampleEchoScoreSchemaV1.newWithId(
        {
          responseId: response.id,
          value: scorerResult.value,
          explanation: scorerResult.explanation,
          metadata: scorerResult.metadata,
          scoringMethod: ScoringMethod.ai,
          match: scorerResult.value >= 0.999,
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

  // If there is no scorer, or scorer didn't produce output, we only return the response.
  return { response };
}
