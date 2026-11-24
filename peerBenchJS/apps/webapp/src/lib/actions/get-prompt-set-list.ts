"use server";

import {
  GetPromptSetListParams,
  PromptSetService,
} from "@/services/promptset.service";

export async function getPromptSetList(params: GetPromptSetListParams) {
  return await PromptSetService.getPromptSetList(params);
}
