"use server";

import { GetReviewsParams, ReviewService } from "@/services/review.service";
import { getUser } from "./auth";

export async function getReviews(options: Omit<GetReviewsParams, "userId">) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await ReviewService.getReviews({ ...options, userId: user.id });
}
