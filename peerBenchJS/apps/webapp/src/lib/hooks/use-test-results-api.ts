import {
  RequestQueryParams as GetTestResultsRequestQueryParams,
  ResponseType as GetTestResultsResponseType,
} from "@/app/api/v1/test-results/get";
import { createApiCaller } from "@/utils/client/create-api-caller";
import { API_TEST_RESULTS } from "../api-endpoints";

const api = {
  getTestResults: createApiCaller<
    GetTestResultsRequestQueryParams,
    GetTestResultsResponseType
  >(API_TEST_RESULTS, {
    method: "GET",
  }),
};

export function useTestResultsAPI() {
  return api;
}
