"use server";

import {
  GetTestResultsParams,
  TestResultService,
} from "@/services/test-result.service";
import { getUser } from "./auth";

export async function getTestResults(params: GetTestResultsParams) {
  const user = await getUser();

  return await TestResultService.getTestResults({
    ...params,
    requestedByUserId: user?.id,
  });
}
