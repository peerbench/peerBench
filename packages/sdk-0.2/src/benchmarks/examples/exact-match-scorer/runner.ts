import { defineRunner } from "@/helpers/define-runner";
import { AbstractLLMProvider } from "@/providers";
import { SimpleSystemPromptSchemaV1 } from "@/schemas/llm";
import { LLMAsAJudgeScorer } from "@/scorers";
import { ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import z from "zod";
import { ExactMatchScorer } from "./scorer";
import {
  ExactMatchResponseSchemaV1,
  ExactMatchScoreSchemaV1,
  ExactMatchTestCaseSchemaV1,
} from "./schema-sets/exact-match.v1";

export const exactMatchScorerRunner = defineRunner(
  {
    schemaSets: [
      {
        testCase: ExactMatchTestCaseSchemaV1,
        response: ExactMatchResponseSchemaV1,
        score: ExactMatchScoreSchemaV1,
      },
    ],
    providers: [AbstractLLMProvider],

    // This runner supports the following scorers. The callers can decide
    // which scorer they want to use.
    scorers: [ExactMatchScorer, LLMAsAJudgeScorer],
    runConfigSchema: {
      model: z.string(),
      temperature: z.number().optional(),
      systemPrompt: SimpleSystemPromptSchemaV1.optional(),
      llmJudgeModel: z.string().optional(),
    },
  },
  async (params) => {
    const { testCase, provider, scorer, runConfig } = params;
    const responseIdGenerator =
      params.idGenerators?.response ?? idGeneratorUUIDv7;
    const scoreIdGenerator = params.idGenerators?.score ?? idGeneratorUUIDv7;

    const messages: ChatCompletionMessageParam[] = [];
    if (runConfig.systemPrompt) {
      messages.push({
        role: "system",
        content: runConfig.systemPrompt.content,
      });
    }

    messages.push({
      role: "user",
      content:
        `Instruction: ${testCase.instruction}\n` +
        `Input:\n${testCase.input}\n\n` +
        `Return ONLY the final output string.`,
    });

    const providerResponse = await provider.forward({
      model: runConfig.model,
      temperature: runConfig.temperature,
      messages,
    });

    const response = await ExactMatchResponseSchemaV1.newWithId(
      {
        data: providerResponse.data,
        startedAt: providerResponse.startedAt,
        completedAt: providerResponse.completedAt,
        testCaseId: testCase.id,
        modelSlug: runConfig.model,
        provider: provider.kind,
        systemPromptId: runConfig.systemPrompt?.id,
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
      if (!runConfig.llmJudgeModel) {
        throw new Error(
          "LLM judge model is required when using LLM as a judge scorer"
        );
      }

      const scorerResult = await scorer.score({
        model: runConfig.llmJudgeModel,

        // LLM as a Judge scorer is flexible, we can define various criteria
        // based on our benchmark requirements.
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
            scorerAIModelSlug: runConfig.llmJudgeModel,
          },
          scoreIdGenerator
        );
        return { response, score };
      }
    }

    return { response };
  }
);
