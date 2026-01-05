import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { idGeneratorUUIDv7 } from "@/utils/id-generator";
import { IdGenerator, RunnerResult, ScoringMethod } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import {
  ExampleMKEchoResponseSchemaV1,
  ExampleMKEchoResponseV1,
  ExampleMKEchoScoreSchemaV1,
  ExampleMKEchoScoreV1,
  ExampleMKEchoTestCaseV1,
} from "./test-cases/echo.v1";
import {
  ExampleMKReverseResponseSchemaV1,
  ExampleMKReverseResponseV1,
  ExampleMKReverseScoreSchemaV1,
  ExampleMKReverseScoreV1,
  ExampleMKReverseTestCaseV1,
} from "./test-cases/reverse.v1";

type TestCase = ExampleMKEchoTestCaseV1 | ExampleMKReverseTestCaseV1;
type Response = ExampleMKEchoResponseV1 | ExampleMKReverseResponseV1;
type Score = ExampleMKEchoScoreV1 | ExampleMKReverseScoreV1;

function reverseString(input: string): string {
  return [...input].reverse().join("");
}

/**
 * Tutorial: one benchmark pack, multiple "kinds".
 *
 * Many benchmarks aren't a single task type. You might have "mcq", "open-ended", "rewrite", etc.
 * In the SDK, the standard way to represent that is multiple TestCase schemas with different `kind`s,
 * then a single runner that dispatches on `testCase.kind`.
 *
 * This file demonstrates that pattern by supporting two kinds:
 * - `example.mk.ts.echo`
 * - `example.mk.ts.reverse`
 *
 * Note: this runner also embeds a tiny deterministic scoring rule. That's a valid choice when:
 * - scoring is cheap and deterministic, and
 * - you don't want scoring to be configurable per run.
 */
export async function runTestCase(params: {
  testCase: TestCase;
  provider: AbstractLLMProvider;
  runConfig: { model: string; temperature?: number };
  systemPrompt?: SimpleSystemPromptV1;
  idGenerators?: { response?: IdGenerator; score?: IdGenerator };
}): Promise<RunnerResult<Response, Score>> {
  const responseIdGenerator =
    params.idGenerators?.response ?? idGeneratorUUIDv7;
  const scoreIdGenerator = params.idGenerators?.score ?? idGeneratorUUIDv7;

  // Even with multiple kinds, the provider interface stays the same.
  // Only the prompt formatting and scoring logic differs per kind.
  const messages: ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt.content });
  }

  if (params.testCase.kind === "example.mk.ts.echo") {
    // Kind 1: "echo"
    messages.push({
      role: "user",
      content: `Echo this text exactly:\n${params.testCase.input}`,
    });

    const providerResponse = await params.provider.forward({
      model: params.runConfig.model,
      temperature: params.runConfig.temperature,
      messages,
    });

    const response: ExampleMKEchoResponseV1 = ExampleMKEchoResponseSchemaV1.new(
      {
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
      }
    );
    response.id = await responseIdGenerator(response);

    // Deterministic scoring can be embedded directly in the runner.
    const match = providerResponse.data.trim() === params.testCase.input.trim();
    const score: ExampleMKEchoScoreV1 = ExampleMKEchoScoreSchemaV1.new({
      id: "",
      value: match ? 1 : 0,
      responseId: response.id,
      scoringMethod: ScoringMethod.algo,
      match,
    });
    score.id = await scoreIdGenerator(score);

    return { response, score };
  }

  if (params.testCase.kind === "example.mk.ts.reverse") {
    // Kind 2: "reverse"
    messages.push({
      role: "user",
      content:
        `Reverse this text character-by-character and return ONLY the reversed string:\n` +
        `${params.testCase.input}`,
    });

    const providerResponse = await params.provider.forward({
      model: params.runConfig.model,
      temperature: params.runConfig.temperature,
      messages,
    });

    const response: ExampleMKReverseResponseV1 =
      ExampleMKReverseResponseSchemaV1.new({
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

    const expected = reverseString(params.testCase.input);
    const match = providerResponse.data.trim() === expected.trim();
    const score: ExampleMKReverseScoreV1 = ExampleMKReverseScoreSchemaV1.new({
      id: "",
      value: match ? 1 : 0,
      responseId: response.id,
      scoringMethod: ScoringMethod.algo,
      match,
    });
    score.id = await scoreIdGenerator(score);

    return { response, score };
  }

  throw new Error("Unsupported test case kind");
}
