"use server";

import {
  EvaluationService,
  SavePeerBenchResultsParams,
} from "@/services/evaluation.service";
import { getUser } from "./auth";

export async function savePeerBenchResults(
  params: Omit<SavePeerBenchResultsParams, "uploaderId">
) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return await EvaluationService.savePeerBenchScores({
    ...params,
    uploaderId: user.id,
  });
}
