"use server";

import { PromptService } from "@/services/prompt.service";
import { Prompt, PromptSchema } from "peerbench";

export async function downloadAllPromptsAction(data: {
  promptSetId: number;
  userId?: string;
}) {
  // Fetch all prompts in the prompt set
  // Using a large page size to get all prompts at once
  const result = await PromptService.getPrompts({
    filters: {
      promptSetId: [data.promptSetId],
      isRevealed: true,
    },
    requestedByUserId: data.userId,
    page: 1,
    pageSize: 100000, // Large page size to get all prompts
  });

  // Parse the raw data strings into JSON objects
  const prompts = result.data.map((rawData) =>
    PromptSchema.parse({
      prompt: rawData.question,
      promptCID: rawData.cid,
      promptSHA256: rawData.sha256,
      options: rawData.options,
      answerKey: rawData.answerKey,
      answer: rawData.answer,
      type: rawData.type,
      fullPrompt: rawData.question,
      fullPromptCID: rawData.cid,
      fullPromptSHA256: rawData.sha256,
      promptUUID: rawData.id,
      metadata: rawData.metadata,
      scorers: rawData.scorers ?? undefined,
    } satisfies Prompt)
  );

  return {
    prompts,
    totalCount: result.totalCount,
  };
}
