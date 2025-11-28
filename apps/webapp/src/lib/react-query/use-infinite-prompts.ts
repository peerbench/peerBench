import { RequestQueryParams as GetPromptsRequestQueryParams } from "@/app/api/v2/prompts/get";
import { QK_PROMPTS } from "./query-keys";
import { useInfiniteQuery, UseInfiniteQueryParams } from "./use-infinite-query";
import { PromptItem, usePromptAPI } from "../hooks/use-prompt-api";

export function useInfinitePrompts(
  params: GetPromptsRequestQueryParams = {},
  infiniteQueryParams?: Partial<UseInfiniteQueryParams<PromptItem>>
) {
  const { getPrompts } = usePromptAPI();
  return useInfiniteQuery({
    queryKey: [`${QK_PROMPTS}/infinite`, params],
    queryFn: ({ pageParam }) =>
      getPrompts({
        page: pageParam,
        pageSize: params.pageSize ?? 10,
        ...params,
      }),
    initialPageParam: 1,
    ...(infiniteQueryParams || {}),
  });
}
