"use server";

import { ReviewService, UpdateReviewParams } from "@/services/review.service";
import { getUser } from "./auth";

export async function updateReview(data: Omit<UpdateReviewParams, "userId">) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await ReviewService.updateReview({
    ...data,
    userId: user.id,
  });
}
