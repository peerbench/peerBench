import { defineRunner } from "@/helpers/define-runner";
import { CallableLLM } from "@/providers";
import { IdGenerator, ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import {
  TextTransformEchoResponseSchemaV1,
  TextTransformEchoScoreSchemaV1,
  TextTransformEchoTestCaseV1,
} from "./schema-sets/echo.v1";
import {
  TextTransformReverseResponseSchemaV1,
  TextTransformReverseScoreSchemaV1,
  TextTransformReverseTestCaseV1,
} from "./schema-sets/reverse.v1";

export const textTransformRunner = defineRunner(
  async (params: {
    testCase: TextTransformEchoTestCaseV1 | TextTransformReverseTestCaseV1;
    target: CallableLLM;
    temperature?: number;
    idGenerators?: {
      response?: IdGenerator;
      score?: IdGenerator;
    };
  }) => {
    const { testCase, target } = params;

    const baseMessages: ChatCompletionMessageParam[] = [];

    if (testCase.kind === "llm/text-transform-echo.tc") {
      baseMessages.push({
        role: "user",
        content: `Echo the following text exactly:\n${testCase.input}`,
      });

      const providerResponse = await target.forward({
        temperature: params.temperature,
        messages: baseMessages,
      });

      const response = await TextTransformEchoResponseSchemaV1.newWithId(
        {
          data: providerResponse.data,
          startedAt: providerResponse.startedAt,
          completedAt: providerResponse.completedAt,
          testCaseId: testCase.id,
          modelSlug: target.slug,
          provider: target.provider.kind,
          inputTokensUsed: providerResponse.inputTokensUsed,
          outputTokensUsed: providerResponse.outputTokensUsed,
          inputCost: providerResponse.inputCost,
          outputCost: providerResponse.outputCost,
        },
        params.idGenerators?.response ?? idGeneratorUUIDv7
      );

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

      const providerResponse = await target.forward({
        temperature: params.temperature,
        messages: baseMessages,
      });

      const response = await TextTransformReverseResponseSchemaV1.newWithId(
        {
          data: providerResponse.data,
          startedAt: providerResponse.startedAt,
          completedAt: providerResponse.completedAt,
          testCaseId: testCase.id,
          modelSlug: target.slug,
          provider: target.provider.kind,
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
