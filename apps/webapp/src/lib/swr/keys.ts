import { RequestQueryParams as GetResponsesRequestQueryParams } from "@/app/api/v2/responses/get";
import { RequestQueryParams as GetScoresRequestQueryParams } from "@/app/api/v2/scores/get";
import { RequestQueryParams as GetAssignablePromptSetsRequestQueryParams } from "@/app/api/v2/prompts/[id]/assignable-prompt-sets/get";
import { RequestQueryParams as GetTopLevelCommentsRequestQueryParams } from "@/app/api/v2/prompts/[id]/comments/[commentId]/replies/get";
import { RequestQueryParams as GetRepliesRequestQueryParams } from "@/app/api/v2/prompts/[id]/comments/[commentId]/replies/get";

export const SWR_GET_SCORE_COMMENTS = (
  scoreId: string,
  params?: GetTopLevelCommentsRequestQueryParams
) => ({
  query: params ?? { page: 1, pageSize: 10 },
  scoreId,
  url: `/api/v2/scores/${scoreId}/comments`,
});

export const SWR_GET_SCORE_COMMENT_REPLIES = (
  scoreId: string,
  commentId: number,
  params?: GetRepliesRequestQueryParams
) => ({
  query: params ?? { page: 1, pageSize: 5 },
  scoreId,
  commentId,
  url: `/api/v2/scores/${scoreId}/comments/${commentId}/replies`,
});

export const SWR_GET_RESPONSE_COMMENTS = (
  responseId: string,
  params?: GetTopLevelCommentsRequestQueryParams
) => ({
  query: params ?? { page: 1, pageSize: 10 },
  responseId,
  url: `/api/v2/responses/${responseId}/comments`,
});

export const SWR_GET_RESPONSE_COMMENT_REPLIES = (
  responseId: string,
  commentId: number,
  params?: GetRepliesRequestQueryParams
) => ({
  query: params ?? { page: 1, pageSize: 5 },
  responseId,
  commentId,
  url: `/api/v2/responses/${responseId}/comments/${commentId}/replies`,
});

export const SWR_GET_PROMPT_COMMENTS = (
  promptId: string,
  params?: GetTopLevelCommentsRequestQueryParams
) => ({
  query: params ?? { page: 1, pageSize: 10 },
  promptId,
  url: `/api/v2/prompts/${promptId}/comments`,
});

export const SWR_GET_PROMPT_COMMENT_REPLIES = (
  promptId: string,
  commentId: number,
  params?: GetRepliesRequestQueryParams
) => ({
  query: params ?? { page: 1, pageSize: 5 },
  promptId,
  commentId,
  url: `/api/v2/prompts/${promptId}/comments/${commentId}/replies`,
});

export const SWR_GET_ASSIGNABLE_PROMPT_SETS = (
  promptId: string,
  params?: GetAssignablePromptSetsRequestQueryParams
) => ({
  query: params,
  promptId,
  url: `/api/v2/prompts/${promptId}/assignable-prompt-sets`,
});

export const SWR_GET_RESPONSES = (
  pageIndex = 0,
  params?: GetResponsesRequestQueryParams
) => ({
  query: {
    page: pageIndex + 1,
    pageSize: params?.pageSize ?? 10,
    ...params,
  },
  url: "/api/v2/responses",
});

export const SWR_GET_SCORES = (
  pageIndex = 0,
  params?: GetScoresRequestQueryParams
) => ({
  query: {
    page: pageIndex + 1,
    pageSize: params?.pageSize ?? 10,
    ...params,
  },
  url: "/api/v2/scores",
});
