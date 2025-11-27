import { RequestQueryParams as GetPromptSetsRequestQueryParams } from "@/app/api/v2/prompt-sets/get";
import { usePromptSetAPI } from "../hooks/use-prompt-set-api";
import { QK_PROMPT_SETS } from "./query-keys";
import { useInfiniteQuery, UseInfiniteQueryParams } from "./use-infinite-query";
import { PromptSetItem } from "../hooks/use-prompt-set-api";

export function useInfinitePromptSets(
  params: GetPromptSetsRequestQueryParams = {},
  infiniteQueryParams?: Partial<UseInfiniteQueryParams<PromptSetItem>>
) {
  const { getPromptSets } = usePromptSetAPI();
  return useInfiniteQuery({
    queryKey: [QK_PROMPT_SETS, params],
    queryFn: ({ pageParam }) =>
      getPromptSets({
        page: pageParam,
        pageSize: params.pageSize ?? 10,
        ...params,
      }),
    initialPageParam: 1,
    ...(infiniteQueryParams || {}),
  });
}
