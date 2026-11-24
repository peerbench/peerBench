"use server";

import { PromptSetService } from "@/services/prompt.service";

export async function getPrompt(promptId: string) {
  return await PromptSetService.getPrompt(promptId);
}
