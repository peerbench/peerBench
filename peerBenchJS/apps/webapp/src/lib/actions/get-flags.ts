"use server";

import { GetFlagsParams, ReviewService } from "@/services/review.service";

export async function getFlags(options?: GetFlagsParams) {
  return await ReviewService.getFlags(options);
}
