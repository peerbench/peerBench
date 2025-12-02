import { RequestQueryParams as GetPromptsRequestQueryParams } from "@/app/api/v2/prompts/get";
import { QK_PROMPTS } from "./query-keys";
import { useInfiniteQuery, UseInfiniteQueryParams } from "./use-infinite-query";
import { APIPromptItem, usePromptAPI } from "../hooks/use-prompt-api";
import { useMemo } from "react";

export function useInfinitePrompts(
  params: GetPromptsRequestQueryParams = {},
  infiniteQueryParams?: Partial<UseInfiniteQueryParams<APIPromptItem>>
) {
  const { getPrompts } = usePromptAPI();
  const queryKey = useMemo(() => [`${QK_PROMPTS}/infinite`, params], [params]);

  return [
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) =>
        getPrompts({
          page: pageParam,
          pageSize: params.pageSize ?? 10,
          ...params,
        }),
      initialPageParam: 1,
      ...(infiniteQueryParams || {}),
    }),
    queryKey,
  ] as const;
}
