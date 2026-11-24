"use server";

import {
  GetTestResultsParams,
  TestResultService,
} from "@/services/test-result.service";
import { getUser } from "./auth";
import { NULL_UUID } from "../constants";

export async function getTestResults(params: GetTestResultsParams) {
  const user = await getUser();

  return await TestResultService.getTestResults({
    ...params,
    filters: {
      ...(params?.filters || {}),
    },
    requestedByUserId: user?.id ?? NULL_UUID,
  });
}
