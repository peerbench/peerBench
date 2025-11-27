import type {
  ResponseType as PromptSetTagsResponseType,
  RequestQueryParams as PromptSetTagsRequestQueryParams,
} from "@/app/api/v1/data/prompt-set/tags/get";
import type {
  ResponseType as PromptSetCategoriesResponseType,
  RequestQueryParams as PromptSetCategoriesRequestQueryParams,
} from "@/app/api/v1/data/prompt-set/categories/get";
import type {
  ResponseType as PromptSetFiltersResponseType,
  RequestQueryParams as PromptSetFiltersRequestQueryParams,
} from "@/app/api/v1/data/filters/prompt-set/get";
import type {
  ResponseType as PromptTagFiltersResponseType,
  RequestQueryParams as PromptTagFiltersRequestQueryParams,
} from "@/app/api/v1/data/filters/prompt-tag/get";
import { createApiCaller } from "@/utils/client/create-api-caller";

const api = {
  getPromptSetFilters: createApiCaller<
    PromptSetFiltersRequestQueryParams,
    PromptSetFiltersResponseType
  >("/api/v1/data/filters/prompt-set", {
    method: "GET",
    errorMessagePrefix: "Failed to fetch Benchmark filters",
  }),

  getPromptSetTags: createApiCaller<
    PromptSetTagsRequestQueryParams,
    PromptSetTagsResponseType
  >("/api/v1/data/prompt-set/tags", {
    method: "GET",
    errorMessagePrefix: "Failed to fetch Benchmark tags",
  }),

  getPromptSetCategories: createApiCaller<
    PromptSetCategoriesRequestQueryParams,
    PromptSetCategoriesResponseType
  >("/api/v1/data/prompt-set/categories", {
    method: "GET",
    errorMessagePrefix: "Failed to fetch Benchmark categories",
  }),

  getPromptTagFilters: createApiCaller<
    PromptTagFiltersRequestQueryParams,
    PromptTagFiltersResponseType
  >("/api/v1/data/filters/prompt-tag", {
    method: "GET",
    errorMessagePrefix: "Failed to fetch Prompt tags",
  }),
};

/**
 * A hook to use the data API which provides
 * miscellaneous data about the peerBench platform.
 */
export function useDataAPI() {
  return api;
}
