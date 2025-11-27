import { RequestQueryParams as GetPromptsRequestQueryParams } from "@/app/api/v2/prompts/get";
import { QK_PROMPTS } from "./query-keys";
import { useInfiniteQuery, UseInfiniteQueryParams } from "./use-infinite-query";
import { PromptItem, usePromptAPI } from "../hooks/use-prompt-api";

export function useInfinitePrompts(
  params: GetPromptsRequestQueryParams = {},
  infiniteQueryParams?: Partial<UseInfiniteQueryParams<PromptItem>>
) {
  // TODO: Define another endpoint for raw data retrieval so types won't be conflict
  // Infinite queries don't use file structure
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { asFileStructured: _, ...restParams } = params;

  const { getPrompts } = usePromptAPI();
  return useInfiniteQuery({
    queryKey: [`${QK_PROMPTS}/infinite`, restParams],
    queryFn: ({ pageParam }) =>
      getPrompts({
        page: pageParam,
        pageSize: restParams.pageSize ?? 10,
        ...restParams,
      }),
    initialPageParam: 1,
    ...(infiniteQueryParams || {}),
  });
}
