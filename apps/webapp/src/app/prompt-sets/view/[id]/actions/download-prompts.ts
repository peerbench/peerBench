"use server";

import { PromptService } from "@/services/prompt.service";

export async function downloadAllPromptsAction(data: {
  promptSetId: number;
  userId?: string;
}) {
  // Fetch all prompts in the prompt set
  // Using a large page size to get all prompts at once
  const result = await PromptService.getPromptsAsFileStructured({
    filters: {
      promptSetId: data.promptSetId,
    },
    requestedByUserId: data.userId,
    page: 1,
    pageSize: 100000, // Large page size to get all prompts
  });

  // Parse the raw data strings into JSON objects
  const prompts = result.data.map((rawData) => JSON.parse(rawData));

  return {
    prompts,
    totalCount: result.totalCount,
  };
}
