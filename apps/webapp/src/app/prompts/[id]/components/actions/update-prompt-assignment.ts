"use server";

import { PromptStatuses } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { getUser } from "@/lib/actions/auth";
import { PromptSetService } from "@/services/promptset.service";
import { revalidatePath } from "next/cache";

export async function updatePromptAssignment(
  promptId: string,
  promptSetId: number
) {
  const user = await getUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    await PromptSetService.updatePromptAssignmentStatus({
      promptId,
      promptSetId,
      status: PromptStatuses.included,
      requestedByUserId: user.id,
    });

    // The page will be re-rendered with the new data
    revalidatePath(`/prompts/${promptId}`);

    return {
      error: undefined,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        error: err.body?.body || err.message,
      };
    }

    console.error(err);
    return {
      error: "An unexpected error occurred",
    };
  }
}
