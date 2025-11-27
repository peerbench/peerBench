import {
  RequestQueryParams as GetPromptSetCategoriesRequestQueryParams,
  ResponseType as GetPromptSetCategoriesResponseType,
} from "@/app/api/v2/filters/prompt-set/categories/get";
import {
  RequestQueryParams as GetPromptSetTagsRequestQueryParams,
  ResponseType as GetPromptSetTagsResponseType,
} from "@/app/api/v2/filters/prompt-set/tags/get";
import {
  RequestQueryParams as GetModelSlugsRequestQueryParams,
  ResponseType as GetModelSlugsResponseType,
} from "@/app/api/v2/filters/models/slugs/get";
import { API_FILTERS } from "@/lib/api-endpoints";
import { createApiCaller } from "@/utils/client/create-api-caller";

const api = {
  getPromptSetCategories: createApiCaller<
    GetPromptSetCategoriesRequestQueryParams,
    GetPromptSetCategoriesResponseType
  >(`${API_FILTERS}/prompt-set/categories`, {
    method: "GET",
    errorMessagePrefix: "Failed to get prompt set categories",
  }),

  getPromptSetTags: createApiCaller<
    GetPromptSetTagsRequestQueryParams,
    GetPromptSetTagsResponseType
  >(`${API_FILTERS}/prompt-set/tags`, {
    method: "GET",
    errorMessagePrefix: "Failed to get prompt set tags",
  }),

  getModelSlugs: createApiCaller<
    GetModelSlugsRequestQueryParams,
    GetModelSlugsResponseType
  >(`${API_FILTERS}/models/slugs`, {
    method: "GET",
    errorMessagePrefix: "Failed to get model slugs",
  }),
};

export function useFilterAPI() {
  return api;
}
