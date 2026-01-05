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
 * Some benchmarks have multiple test case types. In that case, a single benchmark pack can define
 * multiple test case schemas with different `kind` values and use a single runner to handle them.
 *
 * This runner demonstrates how to dispatch on `testCase.kind` and implement different prompt formatting
 * for each kind.
 *
 * This example also includes deterministic scoring inside the runner. This is a valid approach when scoring
 * is cheap and deterministic, and you don't need a separate scorer abstraction.
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

  // Provider request is still the same (messages + model). Only prompt changes based on the kind.
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

    const response = await ExampleMKEchoResponseSchemaV1.newWithId(
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

    // Deterministic scoring can be embedded directly in the runner.
    const match = providerResponse.data.trim() === params.testCase.input.trim();
    const score = await ExampleMKEchoScoreSchemaV1.newWithId(
      {
        value: match ? 1 : 0,
        responseId: response.id,
        scoringMethod: ScoringMethod.algo,
        match,
      },
      scoreIdGenerator
    );

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

    const response = await ExampleMKReverseResponseSchemaV1.newWithId(
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

    const expected = reverseString(params.testCase.input);
    const match = providerResponse.data.trim() === expected.trim();
    const score = await ExampleMKReverseScoreSchemaV1.newWithId(
      {
        value: match ? 1 : 0,
        responseId: response.id,
        scoringMethod: ScoringMethod.algo,
        match,
      },
      scoreIdGenerator
    );

    return { response, score };
  }

  throw new Error("Unsupported test case kind");
}
