import { useQuery } from "@tanstack/react-query";
import { useFilterAPI } from "../hooks/use-filter-api";
import {
  QK_MODEL_SLUGS,
  QK_PROMPT_SET_CATEGORIES,
  QK_PROMPT_SET_TAGS,
} from "./query-keys";
import { RequestQueryParams as GetPromptSetCategoriesRequestQueryParams } from "@/app/api/v2/filters/prompt-set/categories/get";
import { RequestQueryParams as GetPromptSetTagsRequestQueryParams } from "@/app/api/v2/filters/prompt-set/tags/get";
import { RequestQueryParams as GetModelSlugsRequestQueryParams } from "@/app/api/v2/filters/models/slugs/get";

export function usePromptSetCategories(
  params?: GetPromptSetCategoriesRequestQueryParams
) {
  const api = useFilterAPI();
  return useQuery({
    queryKey: [QK_PROMPT_SET_CATEGORIES, params],
    queryFn: () => api.getPromptSetCategories(params),
    select: (res) => res.data,
  });
}

export function usePromptSetTags(params?: GetPromptSetTagsRequestQueryParams) {
  const api = useFilterAPI();
  return useQuery({
    queryKey: [QK_PROMPT_SET_TAGS, params],
    queryFn: () => api.getPromptSetTags(params),
    select: (res) => res.data,
  });
}

export function useModelSlugs(params?: GetModelSlugsRequestQueryParams) {
  const api = useFilterAPI();
  return useQuery({
    queryKey: [QK_MODEL_SLUGS, params],
    queryFn: () => api.getModelSlugs(params),
    select: (res) => res.data,
  });
}
