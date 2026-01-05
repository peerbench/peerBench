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
 * Tutorial: a "runner" is the glue between schemas and runtime execution.
 *
 * You start with a TestCase (already validated by Zod). The runner's job is to:
 * 1) turn that test case into a provider call (for chat LLMs: a `messages[]` array),
 * 2) call the Provider (`provider.forward(...)`) to get model output,
 * 3) map the raw provider output into a persisted Response entity (linking it to the test case),
 * 4) optionally call a scorer and map the scorer output into a persisted Score entity.
 *
 * The important dependency direction is:
 * - runners depend on providers (runtime),
 * - runners depend on schemas (persistence),
 * - providers do NOT depend on benchmarks.
 *
 * The relationship you should keep in your head while writing runners:
 * `TestCase` → Provider → `Response` → (optional) Scorer → `Score`
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

  // Step 1: convert the test case into a provider-friendly request.
  // For chat LLMs in this SDK, we standardize on OpenAI-style `messages[]`.
  const messages: ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt.content });
  }

  // Optional benchmark-level configuration (spec) is where you can put knobs that are not
  // specific to a single test case. Host apps can also use the spec for UI/configuration.
  //
  // In this example we use the spec to inject a prefix/suffix into the user prompt, which is a
  // common pattern when you want to A/B test prompt wrappers without changing every test case.
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

  // Step 2–3: call the provider, then map it into a persisted Response entity.
  // Notice how the Response includes `testCaseId` so it can be joined back to the input later.
  const response: ExampleEchoResponseV1 = ExampleEchoResponseSchemaV1.new({
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

  // Step 4 (optional): scoring.
  // A runner can support multiple scorer implementations; the usual pattern is to dispatch by `scorer.kind`.
  // This keeps the provider backend-agnostic and keeps benchmark scoring rules in benchmark code.
  if (params.scorer?.kind === "example.exactMatch") {
    const scorerResult = await params.scorer.score({
      expected: params.testCase.expectedOutput,
      actual: response.data,
    });

    // The scorer returns a normalized result. The runner turns it into a Score entity and links it via `responseId`.
    const score: ExampleEchoScoreV1 = ExampleEchoScoreSchemaV1.new({
      id: "",
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
    });
    score.id = await scoreIdGenerator(score);
    return { response, score };
  }

  if (params.scorer?.kind === "llmJudge" && params.runConfig.llmJudgeModel) {
    // LLM-judge scoring is useful when deterministic scoring is hard.
    // It is slower/costly, but can express nuanced rubrics.
    const scorerResult = await params.scorer.score({
      task: params.testCase.instruction,
      candidateAnswer: response.data,
      referenceAnswer: params.testCase.expectedOutput,
      model: params.runConfig.llmJudgeModel,
    });

    if (scorerResult !== null) {
      const score: ExampleEchoScoreV1 = ExampleEchoScoreSchemaV1.new({
        id: "",
        responseId: response.id,
        value: scorerResult.value,
        explanation: scorerResult.explanation,
        metadata: scorerResult.metadata,
        scoringMethod: ScoringMethod.ai,
        match: scorerResult.value >= 0.999,

        // These fields make the score auditable across hosts (which judge model/provider produced it).
        scorerAIProvider: scorerResult.provider,
        scorerAIModelSlug: params.runConfig.llmJudgeModel,
        scorerAIInputTokensUsed: scorerResult.inputTokensUsed,
        scorerAIOutputTokensUsed: scorerResult.outputTokensUsed,
        scorerAIInputCost: scorerResult.inputCost,
        scorerAIOutputCost: scorerResult.outputCost,
      });
      score.id = await scoreIdGenerator(score);
      return { response, score };
    }
  }

  // Not every run must produce a score. Returning only a Response is valid and common.
  return { response };
}
