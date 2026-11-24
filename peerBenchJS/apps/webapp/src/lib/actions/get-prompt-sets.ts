"use server";

import { PromptSetService } from "@/services/prompt.service";

export async function getPromptSetsAction(ownerId?: string) {
  return await PromptSetService.getPromptSets({ ownerId });
}
