import type {
  ResponseType as PostResponseType,
  RequestBodyType as PostRequestBodyType,
} from "@/app/api/v2/scores/post";
import {
  RequestQueryParams as GetRequestQueryParams,
  ResponseType as GetResponseType,
} from "@/app/api/v2/scores/get";
import {
  RequestQueryParams as GetTopLevelCommentsRequestQueryParams,
  ResponseType as GetTopLevelCommentsResponseType,
} from "@/app/api/v2/scores/[scoreId]/comments/get";
import {
  RequestQueryParams as GetRepliesRequestQueryParams,
  ResponseType as GetRepliesResponseType,
} from "@/app/api/v2/scores/[scoreId]/comments/[commentId]/replies/get";
import {
  RequestBodyType as PostCommentRequestBodyType,
  ResponseType as PostCommentResponseType,
} from "@/app/api/v2/scores/[scoreId]/comments/post";
import {
  RequestBodyType as PostReplyRequestBodyType,
  ResponseType as PostReplyResponseType,
} from "@/app/api/v2/scores/[scoreId]/comments/[commentId]/replies/post";
import { createApiCaller } from "@/utils/client/create-api-caller";
import {
  RequestBodyType as UpsertQuickFeedbackRequestBodyType,
  ResponseType as UpsertQuickFeedbackResponseType,
} from "@/app/api/v2/scores/[scoreId]/quick-feedback/patch";
import {
  RequestBodyType as GetStatusRequestBodyType,
  ResponseType as GetStatusResponseType,
} from "@/app/api/v2/scores/status/post";

export const SCORES_API_URL = "/api/v2/scores";

const api = {
  getScores: createApiCaller<GetRequestQueryParams, GetResponseType>(
    SCORES_API_URL,
    {
      method: "GET",
      errorMessagePrefix: "Failed to get Scores",
    }
  ),
  postScores: createApiCaller<PostRequestBodyType, PostResponseType>(
    SCORES_API_URL,
    {
      method: "POST",
      errorMessagePrefix: "Failed to upload Score",
    }
  ),

  getStatuses: createApiCaller<GetStatusRequestBodyType, GetStatusResponseType>(
    `${SCORES_API_URL}/status`,
    {
      method: "POST",
      errorMessagePrefix: "Failed to get statuses",
    }
  ),

  getTopLevelComments: (
    scoreId: string,
    params: GetTopLevelCommentsRequestQueryParams
  ) => {
    const callAPI = createApiCaller(`${SCORES_API_URL}/${scoreId}/comments`, {
      method: "GET",
      errorMessagePrefix: "Failed to get comments",
    });

    return callAPI(params) as Promise<GetTopLevelCommentsResponseType>;
  },

  getReplies: (
    scoreId: string,
    commentId: number,
    params: GetRepliesRequestQueryParams
  ) => {
    const callAPI = createApiCaller(
      `${SCORES_API_URL}/${scoreId}/comments/${commentId}/replies`,
      {
        method: "GET",
        errorMessagePrefix: "Failed to get replies",
      }
    );

    return callAPI(params) as Promise<GetRepliesResponseType>;
  },

  postComment: (scoreId: string, params: PostCommentRequestBodyType) => {
    const callAPI = createApiCaller(`${SCORES_API_URL}/${scoreId}/comments`, {
      method: "POST",
      errorMessagePrefix: "Failed to post comment",
    });

    return callAPI(params) as Promise<PostCommentResponseType>;
  },

  postReply: (
    scoreId: string,
    commentId: number,
    params: PostReplyRequestBodyType
  ) => {
    const callAPI = createApiCaller(
      `${SCORES_API_URL}/${scoreId}/comments/${commentId}/replies`,
      {
        method: "POST",
        errorMessagePrefix: "Failed to post reply",
      }
    );

    return callAPI(params) as Promise<PostReplyResponseType>;
  },

  upsertQuickFeedback: (
    scoreId: string,
    params: UpsertQuickFeedbackRequestBodyType
  ) => {
    const callAPI = createApiCaller(
      `${SCORES_API_URL}/${scoreId}/quick-feedback`,
      {
        method: "PATCH",
        errorMessagePrefix: "Failed to update quick feedback",
      }
    );

    return callAPI(params) as Promise<UpsertQuickFeedbackResponseType>;
  },
};

export function useScoreAPI() {
  return api;
}

export type APIScoreItem = Awaited<
  ReturnType<typeof api.getScores>
>["data"][number];
export type APIScoreComment = Awaited<
  ReturnType<typeof api.getTopLevelComments>
>["data"][number];
export type APIScoreStatusItem = Awaited<
  ReturnType<typeof api.getStatuses>
>[number];
