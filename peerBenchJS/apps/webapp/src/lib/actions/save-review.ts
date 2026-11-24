"use server";

import { ReviewService, SaveReviewParams } from "@/services/review.service";
import { getUser } from "./auth";

export async function saveReview(data: Omit<SaveReviewParams, "userId">) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await ReviewService.saveReview({
    ...data,
    userId: user.id,
  });
}
