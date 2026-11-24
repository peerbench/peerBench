"use server";

import { StatsService } from "@/services/stats.service";
import { getUser } from "./auth";

export async function getValidatorStats() {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await StatsService.getValidatorLeaderboard();
}
