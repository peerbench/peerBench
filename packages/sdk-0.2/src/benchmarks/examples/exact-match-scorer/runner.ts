import { defineRunner } from "@/helpers/define-runner";
import { CallableLLM } from "@/providers";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import { LLMAsAJudgeScorer } from "@/scorers";
import { IdGenerator, ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { ExactMatchScorer } from "./scorer";
import {
  ExactMatchResponseSchemaV1,
  ExactMatchScoreSchemaV1,
  ExactMatchTestCaseV1,
} from "./schema-sets/exact-match.v1";

export const exactMatchScorerRunner = defineRunner(
  async (params: {
    testCase: ExactMatchTestCaseV1;
    target: CallableLLM;
    scorer?: ExactMatchScorer | LLMAsAJudgeScorer;
    temperature?: number;
    systemPrompt?: SimpleSystemPromptV1;
    idGenerators?: {
      response?: IdGenerator;
      score?: IdGenerator;
    };
  }) => {
    const { testCase, target, scorer } = params;
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

    messages.push({
      role: "user",
      content:
        `Instruction: ${testCase.instruction}\n` +
        `Input:\n${testCase.input}\n\n` +
        `Return ONLY the final output string.`,
    });

    const providerResponse = await target.forward({
      temperature: params.temperature,
      messages,
    });

    const response = await ExactMatchResponseSchemaV1.newWithId(
      {
        data: providerResponse.data,
        startedAt: providerResponse.startedAt,
        completedAt: providerResponse.completedAt,
        testCaseId: testCase.id,
        modelSlug: target.slug,
        provider: target.provider.kind,
        systemPromptId: params.systemPrompt?.id,
        inputTokensUsed: providerResponse.inputTokensUsed,
        outputTokensUsed: providerResponse.outputTokensUsed,
        inputCost: providerResponse.inputCost,
        outputCost: providerResponse.outputCost,
      },
      responseIdGenerator
    );

    if (scorer?.kind === "example.peerbench.ai/exact-match") {
      const scorerResult = await scorer.score({
        expected: testCase.expectedOutput,
        actual: response.data,
        normalize: testCase.normalize ?? true,
      });

      const score = await ExactMatchScoreSchemaV1.newWithId(
        {
          scoringMethod: ScoringMethod.algo,
          value: scorerResult.value,
          responseId: response.id,
          match: Boolean(scorerResult.metadata?.match),
          explanation: scorerResult.explanation,
          metadata: scorerResult.metadata,
          normalized: scorerResult.metadata?.normalized,
        },
        scoreIdGenerator
      );
      return { response, score };
    }

    if (scorer?.kind === "peerbench.ai/llm-as-a-judge") {
      const scorerResult = await scorer.score({
        criteria: [
          {
            id: "correctness",
            description:
              "Is the response matches with the expected output in terms of the meaning?",
            weight: 1,
          },
        ],
        response: response.data,
        rubric: `Expected output: ${testCase.expectedOutput}`,
      });

      if (scorerResult !== null) {
        const score = await ExactMatchScoreSchemaV1.newWithId(
          {
            scoringMethod: ScoringMethod.ai,
            value: scorerResult.value,
            responseId: response.id,
            match: scorerResult.value >= 0.999,
            explanation: scorerResult.explanation,
            metadata: scorerResult.metadata,
            scorerAIInputCost: scorerResult.inputCost,
            scorerAIOutputCost: scorerResult.outputCost,
            scorerAIInputTokensUsed: scorerResult.inputTokensUsed,
            scorerAIOutputTokensUsed: scorerResult.outputTokensUsed,
            scorerAIProvider: scorerResult.provider,
            scorerAIModelSlug: scorerResult.modelSlug,
          },
          scoreIdGenerator
        );
        return { response, score };
      }
    }

    return { response };
  }
);
