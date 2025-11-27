import { createApiCaller } from "@/utils/client/create-api-caller";
import { API_LEADERBOARD } from "../api-endpoints";
import {
  RequestQueryParams as GetCuratedLeaderboardRequestQueryParams,
  ResponseType as GetCuratedLeaderboardResponseType,
} from "@/app/api/v2/leaderboard/curated/get";

const api = {
  getCuratedLeaderboard: createApiCaller<
    GetCuratedLeaderboardRequestQueryParams,
    GetCuratedLeaderboardResponseType
  >(`${API_LEADERBOARD}/curated`, {
    method: "GET",
    errorMessagePrefix: "Failed to get curated leaderboard",
  }),
};

export function useLeaderboardApi() {
  return api;
}
