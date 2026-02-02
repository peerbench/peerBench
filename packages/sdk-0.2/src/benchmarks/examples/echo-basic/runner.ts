import { defineRunner } from "@/helpers/define-runner";
import { CallableLLM } from "@/providers";
import { IdGenerator } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import {
  EchoBasicResponseSchemaV1,
  EchoBasicTestCaseV1,
} from "./schema-sets/echo.v1";

export const echoBasicRunner = defineRunner(
  async (params: {
    testCase: EchoBasicTestCaseV1;
    target: CallableLLM;
    idGenerators?: {
      response?: IdGenerator;
      score?: IdGenerator;
    };
  }) => {
    const { testCase, target } = params;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: `Echo the following text exactly, without extra words:\n${testCase.input}`,
      },
    ];

    const providerResponse = await target.forward({ messages });

    const response = await EchoBasicResponseSchemaV1.newWithId(
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

    return { response };
  }
);
