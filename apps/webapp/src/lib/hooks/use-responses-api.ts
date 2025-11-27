import type {
  ResponseType as PostResponseType,
  RequestBodyType as PostRequestBodyType,
} from "@/app/api/v2/responses/post";
import type {
  RequestQueryParams as GetRequestQueryParams,
  ResponseType as GetResponseType,
} from "@/app/api/v2/responses/get";
import {
  RequestQueryParams as GetTopLevelCommentsRequestQueryParams,
  ResponseType as GetTopLevelCommentsResponseType,
} from "@/app/api/v2/responses/[responseId]/comments/get";
import {
  RequestQueryParams as GetRepliesRequestQueryParams,
  ResponseType as GetRepliesResponseType,
} from "@/app/api/v2/responses/[responseId]/comments/[commentId]/replies/get";
import {
  RequestBodyType as PostCommentRequestBodyType,
  ResponseType as PostCommentResponseType,
} from "@/app/api/v2/responses/[responseId]/comments/post";
import {
  RequestBodyType as PostReplyRequestBodyType,
  ResponseType as PostReplyResponseType,
} from "@/app/api/v2/responses/[responseId]/comments/[commentId]/replies/post";
import { createApiCaller } from "@/utils/client/create-api-caller";
import {
  RequestBodyType as UpsertQuickFeedbackRequestBodyType,
  ResponseType as UpsertQuickFeedbackResponseType,
} from "@/app/api/v2/responses/[responseId]/quick-feedback/patch";
import {
  RequestBodyType as GetStatusRequestBodyType,
  ResponseType as GetStatusResponseType,
} from "@/app/api/v2/responses/status/post";

export const RESPONSES_API_URL = "/api/v2/responses";

const api = {
  getResponses: createApiCaller<GetRequestQueryParams, GetResponseType>(
    RESPONSES_API_URL,
    {
      method: "GET",
      errorMessagePrefix: "Failed to get Responses",
    }
  ),

  postResponses: createApiCaller<PostRequestBodyType, PostResponseType>(
    RESPONSES_API_URL,
    {
      method: "POST",
      errorMessagePrefix: "Failed to upload Responses",
    }
  ),

  getStatuses: createApiCaller<GetStatusRequestBodyType, GetStatusResponseType>(
    `${RESPONSES_API_URL}/status`,
    {
      method: "POST",
      errorMessagePrefix: "Failed to get statuses",
    }
  ),

  getTopLevelComments: (
    responseId: string,
    params: GetTopLevelCommentsRequestQueryParams
  ) => {
    const callAPI = createApiCaller(
      `${RESPONSES_API_URL}/${responseId}/comments`,
      {
        method: "GET",
        errorMessagePrefix: "Failed to get comments",
      }
    );

    return callAPI(params) as Promise<GetTopLevelCommentsResponseType>;
  },

  getReplies: (
    responseId: string,
    commentId: number,
    params: GetRepliesRequestQueryParams
  ) => {
    const callAPI = createApiCaller(
      `${RESPONSES_API_URL}/${responseId}/comments/${commentId}/replies`,
      {
        method: "GET",
        errorMessagePrefix: "Failed to get replies",
      }
    );

    return callAPI(params) as Promise<GetRepliesResponseType>;
  },

  postComment: (responseId: string, params: PostCommentRequestBodyType) => {
    const callAPI = createApiCaller(
      `${RESPONSES_API_URL}/${responseId}/comments`,
      {
        method: "POST",
        errorMessagePrefix: "Failed to post comment",
      }
    );

    return callAPI(params) as Promise<PostCommentResponseType>;
  },

  postReply: (
    responseId: string,
    commentId: number,
    params: PostReplyRequestBodyType
  ) => {
    const callAPI = createApiCaller(
      `${RESPONSES_API_URL}/${responseId}/comments/${commentId}/replies`,
      {
        method: "POST",
        errorMessagePrefix: "Failed to post reply",
      }
    );

    return callAPI(params) as Promise<PostReplyResponseType>;
  },

  upsertQuickFeedback: (
    responseId: string,
    params: UpsertQuickFeedbackRequestBodyType
  ) => {
    const callAPI = createApiCaller(
      `${RESPONSES_API_URL}/${responseId}/quick-feedback`,
      {
        method: "PATCH",
        errorMessagePrefix: "Failed to update quick feedback",
      }
    );

    return callAPI(params) as Promise<UpsertQuickFeedbackResponseType>;
  },
};

export function useResponsesAPI() {
  return api;
}

export type APIResponseItem = Awaited<
  ReturnType<typeof api.getResponses>
>["data"][number];
export type APIResponseComment = Awaited<
  ReturnType<typeof api.getTopLevelComments>
>["data"][number];
export type APIResponseUserQuickFeedback = Awaited<
  ReturnType<typeof api.getResponses>
>["data"][number]["userQuickFeedback"];
