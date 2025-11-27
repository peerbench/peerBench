"use server";

import { QuickFeedbackOpinion } from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { getUser } from "@/lib/actions/auth";
import { QuickFeedbackService } from "@/services/quickfeedback.service";
import { revalidatePath } from "next/cache";

export async function upsertQuickFeedback(
  promptId: string,
  opinion: QuickFeedbackOpinion
) {
  const user = await getUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    await QuickFeedbackService.upsertQuickFeedback(
      {
        opinion,
        userId: user.id,
        promptId,
      },
      { requestedByUserId: user.id }
    );

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
