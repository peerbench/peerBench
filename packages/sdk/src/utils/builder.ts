import { ForwardResponse } from "@/providers/abstract/abstract-llm-provider";
import {
  Prompt,
  PromptResponseSchema,
  PromptSchema,
  PromptScoreSchema,
  PromptType,
} from "@/types";
import { v7 as uuidv7 } from "uuid";
import { calculateSHA256 } from "./sha256";
import { calculateCID } from "./cid";
import { z } from "zod";

/**
 * Builds a valid Prompt object from the given parameters.
 */
export async function buildPrompt(params: {
  uuid?: string;
  prompt: string;
  fullPrompt?: string;
  options?: Record<string, string>;
  answer?: string;
  answerKey?: string;
  type: PromptType;
  metadata?: Record<string, any>;
  scorers?: string[];
}) {
  const promptData = params.prompt;
  const fullPrompt = params.fullPrompt ?? params.prompt;

  const [promptCID, promptSHA256, fullPromptCID, fullPromptSHA256] =
    await Promise.all([
      calculateCID(promptData).then((c) => c.toString()),
      calculateSHA256(promptData),
      calculateCID(fullPrompt).then((c) => c.toString()),
      calculateSHA256(fullPrompt),
    ]);

  return PromptSchema.parse({
    promptUUID: params.uuid ?? uuidv7(),
    prompt: promptData,
    promptCID,
    promptSHA256,
    fullPrompt: fullPrompt,
    fullPromptCID,
    fullPromptSHA256,
    options: params.options ?? undefined,
    type: params.type,
    answer: params.answer ?? undefined,
    answerKey: params.answerKey ?? undefined,
    metadata: params.metadata ?? undefined,
    scorers: params.scorers ?? undefined,
  });
}

/**
 * Builds a valid PromptResponse object from the given parameters.
 */
export async function buildResponse(params: {
  prompt: Prompt;
  forwardResponse: ForwardResponse;
  provider: string;
  modelSlug: string;

  responseUUID?: string;
  runId?: string;
  responseMetadata?: Record<string, any>;
}) {
  return PromptResponseSchema.parse({
    responseUUID: params.responseUUID ?? uuidv7(),
    runId: params.runId ?? uuidv7(),
    response: params.forwardResponse.data,
    responseSHA256: await calculateSHA256(params.forwardResponse.data),
    responseCID: await calculateCID(params.forwardResponse.data).then((c) =>
      c.toString()
    ),
    startedAt: params.forwardResponse.startedAt.getTime(),
    finishedAt: params.forwardResponse.completedAt.getTime(),
    prompt: params.prompt,
    responseMetadata: params.responseMetadata,

    provider: params.provider,
    modelSlug: params.modelSlug,

    inputTokensUsed: params.forwardResponse.inputTokensUsed,
    inputCost: params.forwardResponse.inputCost,

    outputTokensUsed: params.forwardResponse.outputTokensUsed,
    outputCost: params.forwardResponse.outputCost,
  });
}

/**
 * Builds a valid PromptScore object from the given parameters.
 */
export async function buildScore(
  params: Omit<z.input<typeof PromptScoreSchema>, "scoreUUID"> & {
    // If not given then auto generates a new one.
    scoreUUID?: string;
  }
) {
  return PromptScoreSchema.parse({
    ...params,
    scoreUUID: params.scoreUUID ?? uuidv7(),
  });
}
