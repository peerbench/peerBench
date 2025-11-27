import { useQuery } from "@tanstack/react-query";
import { QK_COAUTHORS } from "./query-keys";
import { usePromptSetAPI } from "../hooks/use-prompt-set-api";
import type { RequestQueryParams as GetCoauthorsRequestQueryParams } from "@/app/api/v2/prompt-sets/[id]/coauthors/get";

export function useCoauthors(
  promptSetId: number,
  { page = 1, pageSize = 100, ...params }: GetCoauthorsRequestQueryParams
) {
  const promptSetAPI = usePromptSetAPI();

  return useQuery({
    queryKey: [QK_COAUTHORS, promptSetId, page, pageSize, params],
    queryFn: () =>
      promptSetAPI.getCoauthors(promptSetId, {
        page,
        pageSize,
        ...params,
      }),
  });
}
