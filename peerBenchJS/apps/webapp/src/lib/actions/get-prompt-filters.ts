"use server";

import { PromptService } from "@/services/prompt.service";

export async function getPromptFiltersAction() {
  return await PromptService.getPromptFilters();
}
