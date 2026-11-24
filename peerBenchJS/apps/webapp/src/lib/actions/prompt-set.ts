"use server";

import { PromptSetService } from "@/services/promptset.service";
import { getUser } from "@/lib/actions/auth";

export async function addPromptsToPromptSet(data: {
  promptSetId: number;
  fileName?: string;
  fileContent: string;
}) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await PromptSetService.addPromptsToPromptSet({
    promptSetId: data.promptSetId,
    fileName: data.fileName,
    fileContent: data.fileContent,
    uploaderId: user.id,
  });
}

export async function createPromptSet(data: {
  title: string;
  description: string;
}) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await PromptSetService.createNewPromptSet({
    title: data.title,
    description: data.description,
    ownerId: user.id,
  });
}
