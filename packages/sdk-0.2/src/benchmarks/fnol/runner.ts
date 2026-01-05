import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { idGeneratorUUIDv7 } from "@/utils/id-generator";
import { IdGenerator, RunnerResult } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { LLMJudgeScorer } from "@/scorers/llm-judge";
import { SimpleSystemPromptV1 } from "@/schemas/llm";
import { parseResponseAsJSON } from "@/utils/llm";
import { ScoringMethod } from "@/types";
import { FNOLFieldsScorer } from "./scorer";
import {
  FNOLFieldsScoreSchemaV1,
  FNOLFieldsScoreV1,
  FNOLLLMJudgeScoreSchemaV1,
  FNOLLLMJudgeScoreV1,
  FNOLResponseSchemaV1,
  FNOLResponseV1,
  FNOLTestCaseV1,
} from "./test-cases/fnol.v1";
import { FNOLDoneReason } from "./types";

function formatFieldsToCollect(
  fieldsToCollect: Record<string, { description: string; required?: boolean }>
) {
  return Object.entries(fieldsToCollect)
    .map(([key, field]) => {
      const required = field.required === false ? "optional" : "required";
      return `- ${key} (${required}): ${field.description}`;
    })
    .join("\n");
}

function hasAllRequiredFields(params: {
  extracted?: Record<string, unknown>;
  fieldsToCollect: Record<string, { required?: boolean }>;
}) {
  const extracted = params.extracted ?? {};
  for (const [key, field] of Object.entries(params.fieldsToCollect)) {
    if (field.required === false) continue;
    const value = extracted[key];
    if (value === undefined || value === null || value === "") return false;
  }
  return true;
}

export async function runTestCase(params: {
  testCase: FNOLTestCaseV1;
  provider: AbstractLLMProvider;
  userSimulatorProvider?: AbstractLLMProvider;
  scorer?: FNOLFieldsScorer | LLMJudgeScorer;
  runConfig: {
    model: string;
    userSimulatorModel?: string;
    llmJudgeModel?: string;
    temperature?: number;
    userSimulatorTemperature?: number;
  };
  systemPrompt?: SimpleSystemPromptV1;
  idGenerators?: {
    response?: IdGenerator;
    score?: IdGenerator;
  };
}): Promise<
  RunnerResult<FNOLResponseV1, FNOLFieldsScoreV1 | FNOLLLMJudgeScoreV1>
> {
  const responseIdGenerator =
    params.idGenerators?.response ?? idGeneratorUUIDv7;
  const scoreIdGenerator = params.idGenerators?.score ?? idGeneratorUUIDv7;

  const userSimulatorProvider = params.userSimulatorProvider ?? params.provider;
  const userSimulatorModel =
    params.runConfig.userSimulatorModel ?? params.runConfig.model;

  const fieldsToCollectText = formatFieldsToCollect(
    params.testCase.fieldsToCollect
  );

  const conversation: ChatCompletionMessageParam[] = [];

  if (params.systemPrompt) {
    conversation.push({
      role: "system",
      content: params.systemPrompt.content,
    });
  }

  conversation.push({
    role: "system",
    content: [
      "You are an insurance FNOL intake assistant.",
      "Your job is to ask the user questions to collect the required fields listed below.",
      "Ask concise questions, one or a few at a time.",
      "When you have enough information OR when you are told to finish, output ONLY a single JSON object with the collected fields.",
      "Do not include markdown fences. Do not include additional text outside the JSON.",
      "",
      "Fields to collect:",
      fieldsToCollectText,
    ].join("\n"),
  });

  conversation.push({
    role: "user",
    content: params.testCase.initialUserMessage,
  });

  let doneReason: FNOLDoneReason | undefined;
  let extracted: Record<string, unknown> | undefined;

  const startedAt = Date.now();

  for (let turn = 0; turn < params.testCase.maxTurns; turn++) {
    const targetReply = await params.provider.forward({
      model: params.runConfig.model,
      temperature: params.runConfig.temperature,
      messages: conversation,
    });

    conversation.push({
      role: "assistant",
      content: targetReply.data,
    });

    extracted = parseResponseAsJSON<Record<string, unknown>>(targetReply.data);
    if (
      extracted &&
      hasAllRequiredFields({
        extracted,
        fieldsToCollect: params.testCase.fieldsToCollect,
      })
    ) {
      doneReason = FNOLDoneReason.modelProvidedJson;
      break;
    }

    const lastAssistantMessage = targetReply.data;

    const simulatedUser = await userSimulatorProvider.forward({
      model: userSimulatorModel,
      temperature: params.runConfig.userSimulatorTemperature,
      messages: [
        {
          role: "system",
          content: [
            "You are simulating a real insurance customer (the user).",
            "Answer the assistant's questions truthfully using ONLY the provided user profile and incident details.",
            "If asked about something not present in the profile, say you don't know.",
            "Be concise and natural. Do not invent new facts.",
            "",
            "User profile (JSON):",
            JSON.stringify(params.testCase.userProfile),
          ].join("\n"),
        },
        {
          role: "user",
          content: lastAssistantMessage,
        },
      ],
    });

    conversation.push({
      role: "user",
      content: simulatedUser.data,
    });
  }

  if (!doneReason) {
    doneReason = FNOLDoneReason.reachedMaxTurns;

    const forced = await params.provider.forward({
      model: params.runConfig.model,
      temperature: params.runConfig.temperature,
      messages: [
        ...conversation,
        {
          role: "user",
          content:
            "Stop the interview now and output ONLY the final JSON object with the collected fields. No extra text.",
        },
      ],
    });

    conversation.push({ role: "assistant", content: forced.data });
    extracted = parseResponseAsJSON<Record<string, unknown>>(forced.data);
    if (extracted) {
      doneReason = FNOLDoneReason.forcedFinalJson;
    }
  }

  const completedAt = Date.now();
  const lastAssistant = [...conversation]
    .reverse()
    .find((m) => m.role === "assistant");

  const response: FNOLResponseV1 = FNOLResponseSchemaV1.new({
    id: "",
    data:
      typeof lastAssistant?.content === "string" ? lastAssistant.content : "",
    startedAt,
    completedAt,
    testCaseId: params.testCase.id,
    modelSlug: params.runConfig.model,
    provider: params.provider.kind,
    conversation: conversation.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content),
    })),
    turnsUsed: conversation.filter((m) => m.role === "assistant").length,
    doneReason,
    extracted,
  });
  response.id = await responseIdGenerator(response);

  if (params.scorer?.kind === "fnol.fields") {
    const scorerResult = await params.scorer.score({
      fieldsToCollect: params.testCase.fieldsToCollect,
      extracted,
    });

    const score: FNOLFieldsScoreV1 = FNOLFieldsScoreSchemaV1.new({
      id: "",
      responseId: response.id,
      value: scorerResult.value,
      explanation: scorerResult.explanation,
      metadata: scorerResult.metadata,
      scoringMethod: ScoringMethod.algo,

      requiredKeys: scorerResult.requiredKeys,
      presentKeys: scorerResult.presentKeys,
      missingKeys: scorerResult.missingKeys,
      mismatchedKeys: scorerResult.mismatchedKeys,
    });
    score.id = await scoreIdGenerator(score);
    return { response, score };
  }

  if (params.scorer?.kind === "llmJudge" && params.runConfig.llmJudgeModel) {
    const scorerResult = await params.scorer.score({
      task: "Evaluate whether the FNOL JSON contains the required fields and correct values.",
      candidateAnswer: response.data,
      referenceAnswer: JSON.stringify(
        Object.fromEntries(
          Object.entries(params.testCase.fieldsToCollect).map(([k, v]) => [
            k,
            v.expected,
          ])
        )
      ),
      model: params.runConfig.llmJudgeModel,
      meta: {
        fieldsToCollect: params.testCase.fieldsToCollect,
        doneReason,
      },
    });

    if (scorerResult !== null) {
      const score: FNOLLLMJudgeScoreV1 = FNOLLLMJudgeScoreSchemaV1.new({
        id: "",
        responseId: response.id,
        value: scorerResult.value,
        explanation: scorerResult.explanation,
        metadata: scorerResult.metadata,
        scoringMethod: ScoringMethod.ai,
        verdict: scorerResult.verdict,

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

  return { response };
}
