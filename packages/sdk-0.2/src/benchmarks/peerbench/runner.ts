import { defineRunner } from "@/helpers/define-runner";
import { AbstractLLMProvider } from "@/providers";
import {
  SimpleSystemPromptSchemaV1,
  SimpleSystemPromptV1,
} from "@/schemas/llm";
import { LLMAsAJudgeScorer, MCQScorer } from "@/scorers";
import { IdGenerator, ScoringMethod } from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/index";
import Handlebars from "handlebars";
import z from "zod";
import {
  MCQResponseSchemaV1,
  MCQScoreSchemaV1,
  MCQTestCaseSchemaV1,
  MCQTestCaseV1,
} from "./schema-sets/mcq.v1";
import {
  QAResponseSchemaV1,
  QAScoreSchemaV1,
  QATestCaseSchemaV1,
  QATestCaseV1,
} from "./schema-sets/qa.v1";
import { PEERBENCH_NAMESPACE } from "@/constants";

export const peerbenchRunner = defineRunner(
  {
    schemaSets: [
      {
        testCase: MCQTestCaseSchemaV1,
        response: MCQResponseSchemaV1,
        score: MCQScoreSchemaV1,
      },
      {
        testCase: QATestCaseSchemaV1,
        response: QAResponseSchemaV1,
        score: QAScoreSchemaV1,
      },
    ],
    providers: [AbstractLLMProvider],
    scorers: [LLMAsAJudgeScorer, MCQScorer],

    runConfigSchema: {
      model: z.string(),
      llmJudgeModel: z.string().optional(),
      llmJudgeSystemPrompt: SimpleSystemPromptSchemaV1.optional(),
      llmJudgeFieldsToExtract: z
        .record(z.string(), z.custom<z.ZodType>())
        .optional(),
      systemPrompt: SimpleSystemPromptSchemaV1.optional(),
      templateVariables: z.record(z.string(), z.string()).optional(),
    },
  },
  async (params) => {
    const { testCase, provider, scorer, runConfig } = params;
    const messages: ChatCompletionMessageParam[] = [];

    if (runConfig.systemPrompt) {
      messages.push({
        role: "system",
        content: runConfig.systemPrompt.content,
      });
    }

    if (testCase.kind === "llm/mcq.tc") {
      messages.push({
        role: "user",
        content: formatMCQ(testCase),
      });
      templateMessages(messages, runConfig.templateVariables ?? {});

      return runMCQ({
        testCase,
        messages,
        provider,
        scorer,
        runConfig,
        idGenerators: {
          response: params.idGenerators?.response ?? idGeneratorUUIDv7,
          score: params.idGenerators?.score ?? idGeneratorUUIDv7,
        },
      });
    }

    if (testCase.kind === "llm/qa.tc") {
      if (
        scorer &&
        scorer?.kind !== (`${PEERBENCH_NAMESPACE}/llm-as-a-judge` as const)
      ) {
        throw new Error(
          `QA test cases can only be scored with an LLM as a judge scorer, but ${scorer?.kind} was provided`
        );
      }

      messages.push({
        role: "user",
        content: testCase.question,
      });
      templateMessages(messages, runConfig.templateVariables ?? {});

      return runQA({
        testCase,
        messages,
        provider,
        scorer,
        runConfig,
        idGenerators: {
          response: params.idGenerators?.response ?? idGeneratorUUIDv7,
          score: params.idGenerators?.score ?? idGeneratorUUIDv7,
        },
      });
    }

    throw new Error("Unsupported test case kind");
  }
);

async function runQA(params: {
  messages: ChatCompletionMessageParam[];
  testCase: QATestCaseV1;
  provider: AbstractLLMProvider;
  scorer?: LLMAsAJudgeScorer;
  runConfig: {
    model: string;
    llmJudgeModel?: string;
    llmJudgeSystemPrompt?: SimpleSystemPromptV1;
    llmJudgeFieldsToExtract?: Record<string, z.ZodType>;
    systemPrompt?: SimpleSystemPromptV1;
  };
  idGenerators: {
    response: IdGenerator;
    score: IdGenerator;
  };
}) {
  const { messages, testCase, provider, scorer, runConfig } = params;

  const providerResponse = await provider.forward({
    model: runConfig.model,
    messages,
  });

  const response = await QAResponseSchemaV1.newWithId(
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
    params.idGenerators?.response ?? idGeneratorUUIDv7
  );

  if (scorer?.kind === (`${PEERBENCH_NAMESPACE}/llm-as-a-judge` as const)) {
    if (!runConfig.llmJudgeModel) {
      throw new Error(
        "LLM judge model is required when using LLM as a judge scorer"
      );
    }

    const scorerResult = await scorer.score({
      model: runConfig.llmJudgeModel,
      response: response.data,
      rubric: `Expected/Valid answers: ${testCase.goodAnswers.join("\n")}\nInvalid answers: ${testCase.badAnswers.join("\n")}`,
      systemPrompt: runConfig.llmJudgeSystemPrompt?.content,
      criteria: [
        {
          id: "correctness",
          description:
            "Is the response matches with the expected/valid answers in terms of meaning?",
          weight: 1,
        },
      ],
      fieldsToExtract: runConfig.llmJudgeFieldsToExtract ?? {},
    });

    if (scorerResult !== null) {
      const score = await QAScoreSchemaV1.newWithId(
        {
          scoringMethod: ScoringMethod.ai,
          value: scorerResult.value,
          responseId: response.id,
          explanation: scorerResult.explanation,
          scorerAIInputCost: scorerResult.inputCost,
          scorerAIOutputCost: scorerResult.outputCost,
          scorerAIInputTokensUsed: scorerResult.inputTokensUsed,
          scorerAIOutputTokensUsed: scorerResult.outputTokensUsed,
          scorerAIProvider: scorerResult.provider,
          scorerAIModelSlug: runConfig.llmJudgeModel,
          scorerAISystemPromptId: runConfig.llmJudgeSystemPrompt?.id,
          metadata: {
            ...scorerResult.metadata,
            extractedFields: scorerResult.extractedFields,
          },
        },
        params.idGenerators?.score ?? idGeneratorUUIDv7
      );

      return { response, score };
    }
  }

  return { response };
}

async function runMCQ(params: {
  messages: ChatCompletionMessageParam[];
  testCase: MCQTestCaseV1;
  provider: AbstractLLMProvider;
  scorer?: MCQScorer | LLMAsAJudgeScorer;
  runConfig: {
    model: string;
    llmJudgeModel?: string;
    llmJudgeSystemPrompt?: SimpleSystemPromptV1;
    llmJudgeFieldsToExtract?: Record<string, z.ZodType>;
    systemPrompt?: SimpleSystemPromptV1;
  };
  idGenerators: {
    response: IdGenerator;
    score: IdGenerator;
  };
}) {
  const { messages, testCase, provider, scorer, runConfig } = params;

  const providerResponse = await provider.forward({
    model: runConfig.model,
    messages,
  });

  const response = await MCQResponseSchemaV1.newWithId(
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
    params.idGenerators?.response ?? idGeneratorUUIDv7
  );

  if (scorer?.kind === (`${PEERBENCH_NAMESPACE}/mcq` as const)) {
    const scorerResult = await scorer.score({
      response: response.data,
      choices: testCase.options,
      correctAnswers: testCase.correctAnswerKeys,
    });

    if (scorerResult !== null) {
      const score = await MCQScoreSchemaV1.newWithId(
        {
          scoringMethod: ScoringMethod.algo,
          value: scorerResult.value,
          responseId: response.id,
          extractedAnswers: scorerResult.extractedAnswers,
          explanation: scorerResult.explanation,
          metadata: scorerResult.metadata,
        },
        params.idGenerators?.score ?? idGeneratorUUIDv7
      );

      return { response, score };
    }
  }

  if (scorer?.kind === (`${PEERBENCH_NAMESPACE}/llm-as-a-judge` as const)) {
    if (!runConfig.llmJudgeModel) {
      throw new Error(
        "LLM judge model is required when using LLM as a judge scorer"
      );
    }

    const scorerResult = await scorer.score({
      model: runConfig.llmJudgeModel,
      criteria: [
        {
          id: "correctness",
          description:
            "Is the given answer key matches with one of the correct answer keys?",
          weight: 1,
        },
      ],
      rubric: `Answer text itself or the key (A, B, C) is accepted
Valid answer keys: ${testCase.correctAnswerKeys.map((key) => `- ${key}`).join("\n")}
Valid Answer texts: ${testCase.correctAnswerKeys.map((key) => `- ${testCase.options?.[key] ?? ""}`).join("\n")}`,
      fieldsToExtract: {
        extractedAnswers: z
          .string()
          .array()
          .describe(
            "The extracted answer keys, valid or invalid (even if the answer text is provided rather than the key)"
          ),
        ...(runConfig.llmJudgeFieldsToExtract ?? {}),
      },
      response: response.data,
      systemPrompt: runConfig.llmJudgeSystemPrompt?.content,
    });

    if (scorerResult !== null) {
      const { extractedAnswers, ...extractedFields } =
        scorerResult.extractedFields;
      const score = await MCQScoreSchemaV1.newWithId(
        {
          scoringMethod: ScoringMethod.ai,
          value: scorerResult.value,
          extractedAnswers,
          responseId: response.id,
          explanation: scorerResult.explanation,
          scorerAIInputCost: scorerResult.inputCost,
          scorerAIOutputCost: scorerResult.outputCost,
          scorerAIInputTokensUsed: scorerResult.inputTokensUsed,
          scorerAIOutputTokensUsed: scorerResult.outputTokensUsed,
          scorerAIProvider: scorerResult.provider,
          scorerAIModelSlug: runConfig.llmJudgeModel,
          scorerAISystemPromptId: runConfig.llmJudgeSystemPrompt?.id,
          metadata: {
            ...scorerResult.metadata,
            extractedFields,
          },
        },
        params.idGenerators?.score ?? idGeneratorUUIDv7
      );

      return { response, score };
    }
  }

  return { response };
}

function formatMCQ(testCase: MCQTestCaseV1) {
  return `Question: ${testCase.question}\nOptions:\n${Object.entries(
    testCase.options ?? {}
  )
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}`;
}

function templateMessages(
  messages: ChatCompletionMessageParam[],
  templateVariables: Record<string, string>
) {
  for (let i = 0; i < messages.length; i++) {
    const template = Handlebars.compile(messages[i]!.content);
    messages[i]!.content = template(templateVariables);
  }
}
