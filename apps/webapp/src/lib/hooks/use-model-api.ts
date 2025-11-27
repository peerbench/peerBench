import type {
  ResponseType as GetRandomModelsResponseType,
  RequestQueryParams as GetRandomModelsRequestParams,
} from "@/app/api/v2/models/random/get";
import type {
  RequestBodyType as PostModelMatchRequestBodyType,
  ResponseType as PostModelMatchResponseType,
} from "@/app/api/v2/model-matches/post";
import type { ResponseType as GetModelMatchResponseType } from "@/app/api/v2/model-matches/[id]/route";
import type { ResponseType as ShareModelMatchResponseType } from "@/app/api/v2/model-matches/[id]/share/route";
import { createApiCaller } from "@/utils/client/create-api-caller";

const api = {
  getRandomModels: (params?: GetRandomModelsRequestParams) => {
    const callAPI = createApiCaller(`/api/v2/models/random`, {
      method: "GET",
      errorMessagePrefix: "Failed to get random models",
    });

    return callAPI(params) as Promise<GetRandomModelsResponseType>;
  },

  postModelMatch: createApiCaller<
    PostModelMatchRequestBodyType,
    PostModelMatchResponseType
  >("/api/v2/model-matches", {
    method: "POST",
    errorMessagePrefix: "Failed to save model match",
  }),

  getModelMatch: (matchId: string) => {
    const caller = createApiCaller<
      Record<string, never>,
      GetModelMatchResponseType
    >(`/api/v2/model-matches/${matchId}`, {
      method: "GET",
      errorMessagePrefix: "Failed to get model match",
    });

    return caller({}) as Promise<GetModelMatchResponseType>;
  },

  shareModelMatch: (matchId: string) => {
    const caller = createApiCaller<
      Record<string, never>,
      ShareModelMatchResponseType
    >(`/api/v2/model-matches/${matchId}/share`, {
      method: "PATCH",
      errorMessagePrefix: "Failed to share model match",
    });

    return caller({}) as Promise<ShareModelMatchResponseType>;
  },
};

export function useModelAPI() {
  return api;
}

export type RandomModelItem = GetRandomModelsResponseType["data"][number];
