"use server";

import { PromptSetService } from "@/services/prompt.service";

export async function getPromptIds(promptSetId: number) {
  return await PromptSetService.getPromptIds(promptSetId);
}
