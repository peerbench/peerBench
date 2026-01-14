import { defineRunner } from "@/helpers/define-runner";
import { AbstractLLMProvider } from "@/providers";
import { ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import z from "zod";
import {
  TextTransformEchoResponseSchemaV1,
  TextTransformEchoScoreSchemaV1,
  TextTransformEchoTestCaseSchemaV1,
} from "./schema-sets/echo.v1";
import {
  TextTransformReverseResponseSchemaV1,
  TextTransformReverseScoreSchemaV1,
  TextTransformReverseTestCaseSchemaV1,
} from "./schema-sets/reverse.v1";

export const textTransformRunner = defineRunner(
  {
    schemaSets: [
      {
        testCase: TextTransformEchoTestCaseSchemaV1,
        response: TextTransformEchoResponseSchemaV1,
        score: TextTransformEchoScoreSchemaV1,
      },
      {
        testCase: TextTransformReverseTestCaseSchemaV1,
        response: TextTransformReverseResponseSchemaV1,
        score: TextTransformReverseScoreSchemaV1,
      },
    ],
    providers: [AbstractLLMProvider],
    scorers: [],
    runConfigSchema: {
      model: z.string(),
      temperature: z.number().optional(),
    },
  },
  async (params) => {
    const { testCase, provider, runConfig } = params;

    const baseMessages: ChatCompletionMessageParam[] = [];

    if (testCase.kind === "llm/text-transform-echo.tc") {
      baseMessages.push({
        role: "user",
        content: `Echo the following text exactly:\n${testCase.input}`,
      });

      const providerResponse = await provider.forward({
        model: runConfig.model,
        temperature: runConfig.temperature,
        messages: baseMessages,
      });

      // Generate a response entity connected to the test case.
      const response = await TextTransformEchoResponseSchemaV1.newWithId(
        {
          data: providerResponse.data,
          startedAt: providerResponse.startedAt,
          completedAt: providerResponse.completedAt,
          testCaseId: testCase.id,
          modelSlug: runConfig.model,
          provider: provider.kind,
          inputTokensUsed: providerResponse.inputTokensUsed,
          outputTokensUsed: providerResponse.outputTokensUsed,
          inputCost: providerResponse.inputCost,
          outputCost: providerResponse.outputCost,
        },
        params.idGenerators?.response ?? idGeneratorUUIDv7
      );

      // For some tasks deterministic scoring is cheap and stable, so we do it inside the runner.
      const match =
        normalizeForCompare(providerResponse.data) ===
        normalizeForCompare(testCase.input);

      const score = await TextTransformEchoScoreSchemaV1.newWithId(
        {
          scoringMethod: ScoringMethod.algo,
          value: match ? 1 : 0,
          responseId: response.id,
          match,
        },
        params.idGenerators?.score ?? idGeneratorUUIDv7
      );

      return { response, score };
    }

    if (testCase.kind === "llm/text-transform-reverse.tc") {
      baseMessages.push({
        role: "user",
        content:
          `Reverse the following text character-by-character and return ONLY the reversed string:\n` +
          `${testCase.input}`,
      });

      const providerResponse = await provider.forward({
        model: runConfig.model,
        temperature: runConfig.temperature,
        messages: baseMessages,
      });

      // Generate a response entity connected to the test case.
      const response = await TextTransformReverseResponseSchemaV1.newWithId(
        {
          data: providerResponse.data,
          startedAt: providerResponse.startedAt,
          completedAt: providerResponse.completedAt,
          testCaseId: testCase.id,
          modelSlug: runConfig.model,
          provider: provider.kind,
          inputTokensUsed: providerResponse.inputTokensUsed,
          outputTokensUsed: providerResponse.outputTokensUsed,
          inputCost: providerResponse.inputCost,
          outputCost: providerResponse.outputCost,
        },
        params.idGenerators?.response ?? idGeneratorUUIDv7
      );

      const expected = reverseString(testCase.input);
      const match =
        normalizeForCompare(providerResponse.data) ===
        normalizeForCompare(expected);

      // We store `expected` in the score object so it can be inspected without re-running the transform.
      const score = await TextTransformReverseScoreSchemaV1.newWithId(
        {
          scoringMethod: ScoringMethod.algo,
          value: match ? 1 : 0,
          responseId: response.id,
          match,
          expected,
        },
        params.idGenerators?.score ?? idGeneratorUUIDv7
      );

      return { response, score };
    }

    throw new Error("Unsupported test case kind");
  }
);

function normalizeForCompare(input: string) {
  return input.trim().replaceAll("\r\n", "\n");
}

function reverseString(input: string) {
  return [...input].reverse().join("");
}
