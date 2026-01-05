import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { idGeneratorUUIDv7 } from "@/utils/id-generator";
import { IdGenerator, RunnerResult, ScoringMethod } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { LLMJudgeScorer } from "@/scorers/llm-judge";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import { ExampleMSKeywordsScorer } from "./scorer";
import {
  ExampleMSKeywordsResponseSchemaV1,
  ExampleMSKeywordsResponseV1,
  ExampleMSKeywordsScoreSchemaV1,
  ExampleMSKeywordsScoreV1,
  ExampleMSKeywordsTestCaseV1,
} from "./test-cases/keywords.v1";

/**
 * Tutorial: supporting multiple scorer implementations.
 *
 * In practice, you often want two scoring modes:
 * - a fast deterministic scorer (cheap, stable, easy to debug)
 * - an LLM judge scorer (flexible rubric, but slower/costly)
 *
 * The runner is the place where this gets wired together. Why?
 * - The provider only knows how to talk to a backend.
 * - The scorer only knows how to evaluate a response.
 * - The runner is the only component that sees both the TestCase and the Response entity,
 *   so it can translate them into the scorer's input and then persist a Score.
 *
 * The common pattern is dispatching on `scorer.kind` so you can pass different scorer
 * instances without changing the runner API.
 */
export async function runTestCase(params: {
  testCase: ExampleMSKeywordsTestCaseV1;
  provider: AbstractLLMProvider;
  scorer: ExampleMSKeywordsScorer | LLMJudgeScorer;
  runConfig: { model: string; llmJudgeModel?: string; temperature?: number };
  systemPrompt?: SimpleSystemPromptV1;
  idGenerators?: { response?: IdGenerator; score?: IdGenerator };
}): Promise<
  RunnerResult<ExampleMSKeywordsResponseV1, ExampleMSKeywordsScoreV1>
> {
  const responseIdGenerator =
    params.idGenerators?.response ?? idGeneratorUUIDv7;
  const scoreIdGenerator = params.idGenerators?.score ?? idGeneratorUUIDv7;

  // The runner builds provider messages from the test case.
  const messages: ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt.content });
  }

  messages.push({ role: "user", content: params.testCase.prompt });

  const providerResponse = await params.provider.forward({
    model: params.runConfig.model,
    temperature: params.runConfig.temperature,
    messages,
  });

  const response: ExampleMSKeywordsResponseV1 =
    ExampleMSKeywordsResponseSchemaV1.new({
      id: "",
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
    });
  response.id = await responseIdGenerator(response);

  // Scorer #1: deterministic keyword coverage.
  if (params.scorer.kind === "example.ms.keywords") {
    const result = await params.scorer.score({
      requiredKeywords: params.testCase.requiredKeywords,
      response: response.data,
    });

    const score: ExampleMSKeywordsScoreV1 = ExampleMSKeywordsScoreSchemaV1.new({
      id: "",
      responseId: response.id,
      value: result.value,
      explanation: result.explanation,
      metadata: result.metadata,
      scoringMethod: ScoringMethod.algo,
      present: result.present,
      missing: result.missing,
    });
    score.id = await scoreIdGenerator(score);
    return { response, score };
  }

  // Scorer #2: LLM judge (slower, but flexible).
  if (params.scorer.kind === "llmJudge" && params.runConfig.llmJudgeModel) {
    const judge = await params.scorer.score({
      task: "Check if the candidate response includes all required keywords.",
      candidateAnswer: response.data,
      referenceAnswer: JSON.stringify({
        requiredKeywords: params.testCase.requiredKeywords,
      }),
      model: params.runConfig.llmJudgeModel,
      meta: { requiredKeywords: params.testCase.requiredKeywords },
    });

    if (judge) {
      // This example reuses the same Score schema regardless of scorer type.
      // Real benchmarks often include judge-specific fields via schema extensions.
      const present = params.testCase.requiredKeywords;
      const missing: string[] = [];
      const score: ExampleMSKeywordsScoreV1 =
        ExampleMSKeywordsScoreSchemaV1.new({
          id: "",
          responseId: response.id,
          value: judge.value,
          explanation: judge.explanation,
          metadata: judge.metadata,
          scoringMethod: ScoringMethod.ai,
          present,
          missing,
        });
      score.id = await scoreIdGenerator(score);
      return { response, score };
    }
  }

  throw new Error("Invalid scorer configuration");
}
