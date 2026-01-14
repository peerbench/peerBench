import { defineRunner } from "@/helpers/define-runner";
import { AbstractLLMProvider } from "@/providers";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { z } from "zod";
import {
  EchoBasicResponseSchemaV1,
  EchoBasicScoreSchemaV1,
  EchoBasicTestCaseSchemaV1,
} from "./schema-sets/echo.v1";

/**
 * Runners are the backbone of a benchmark. They are responsible for executing the test cases and producing
 * the responses and scores. As the benchmark builder, you define what schemas the runner can work with,
 * what are the providers and scorers are supported and what configurations can be passed by the caller
 * at the execution phase.
 */
export const echoBasicRunner = defineRunner(
  {
    schemaSets: [
      {
        testCase: EchoBasicTestCaseSchemaV1,
        response: EchoBasicResponseSchemaV1,
        score: EchoBasicScoreSchemaV1,
      },
    ],
    providers: [AbstractLLMProvider],
    scorers: [],
    runConfigSchema: {
      model: z.string(),
    },
  },
  async (params) => {
    const { testCase, provider, runConfig } = params;

    // This runner is using LLM provider so we need to shape the test case into a provider request.
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: `Echo the following text exactly, without extra words:\n${testCase.input}`,
      },
    ];

    // Forward the request to the provider and get the response
    const providerResponse = await provider.forward({
      model: runConfig.model,
      messages,
    });

    // The response we collected from the provider is in raw version (defined by AbstractLLMProvider)
    // and now we need to convert it to a response entity that was associated with the test case schema.

    // Use the helper `newWithId` function to create a new response entity with an ID generator function.
    const response = await EchoBasicResponseSchemaV1.newWithId(
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

    return { response };
  }
);
