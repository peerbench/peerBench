"use server";

import {
  GetTestResultFilterValuesParams,
  TestResultService,
} from "@/services/test-result.service";

export async function getTestResultFilterValues(
  params: GetTestResultFilterValuesParams
) {
  return await TestResultService.getTestResultFilterValues(params);
}
