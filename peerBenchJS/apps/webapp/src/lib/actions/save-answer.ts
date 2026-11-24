"use server";

import { PromptSetService } from "@/services/prompt.service";

export async function saveAnswer(
  userId: string,
  promptId: string,
  selectedAnswer: string
) {
  await PromptSetService.saveUserAnswer({
    promptId,
    userId,
    selectedOption: selectedAnswer,
  });
}
