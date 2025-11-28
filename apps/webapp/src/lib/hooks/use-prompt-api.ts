import {
  RequestBodyType as PostRequestBodyType,
  ResponseType as PostResponseType,
} from "@/app/api/v2/prompts/post";
import {
  RequestQueryParams as GetRequestQueryParams,
  ResponseType as GetResponseType,
} from "@/app/api/v2/prompts/get";
import {
  RequestQueryParams as GetAssignablePromptSetsRequestQueryParams,
  ResponseType as GetAssignablePromptSetsResponseType,
} from "@/app/api/v2/prompts/[id]/assignable-prompt-sets/get";
import {
  RequestBodyType as UpsertQuickFeedbackRequestBodyType,
  ResponseType as UpsertQuickFeedbackResponseType,
} from "@/app/api/v2/prompts/[id]/quick-feedback/patch";
import {
  RequestQueryParams as GetTopLevelCommentsRequestQueryParams,
  ResponseType as GetTopLevelCommentsResponseType,
} from "@/app/api/v2/prompts/[id]/comments/[commentId]/replies/get";
import {
  RequestQueryParams as GetRepliesRequestQueryParams,
  ResponseType as GetRepliesResponseType,
} from "@/app/api/v2/prompts/[id]/comments/[commentId]/replies/get";
import {
  RequestBodyType as PostCommentRequestBodyType,
  ResponseType as PostCommentResponseType,
} from "@/app/api/v2/prompts/[id]/comments/post";
import {
  RequestBodyType as PostReplyRequestBodyType,
  ResponseType as PostReplyResponseType,
} from "@/app/api/v2/prompts/[id]/comments/[commentId]/replies/post";
import { ResponseType as CheckByHashResponseType } from "@/app/api/v2/prompts/check-by-hash/get";
import {
  RequestBodyType as GetStatusRequestBodyType,
  ResponseType as GetStatusResponseType,
} from "@/app/api/v2/prompts/status/post";
import { createApiCaller } from "@/utils/client/create-api-caller";

export const PROMPTS_API_URL = "/api/v2/prompts";

const api = {
  postPrompts: createApiCaller<PostRequestBodyType, PostResponseType>(
    PROMPTS_API_URL,
    {
      method: "POST",
      errorMessagePrefix: "Failed to save Prompts",
    }
  ),

  /**
   * Get prompts with optional filtering and pagination
   */
  getPrompts: (params?: GetRequestQueryParams) => {
    // Since get prompts endpoint can return different types,
    // we are extending `createApiCaller`'s return type to have proper
    // return type based on the given parameter.
    const callAPI = createApiCaller(PROMPTS_API_URL, {
      method: "GET",
      errorMessagePrefix: "Failed to get Prompts",
    });

    return callAPI(params) as Promise<GetResponseType>;
  },

  getAssignablePromptSets: async (
    promptId: string,
    params?: GetAssignablePromptSetsRequestQueryParams
  ) => {
    const callAPI = createApiCaller(
      `${PROMPTS_API_URL}/${promptId}/assignable-prompt-sets`,
      {
        method: "GET",
        errorMessagePrefix: "Failed to get assignable Benchmarks",
      }
    );

    return callAPI(params) as Promise<GetAssignablePromptSetsResponseType>;
  },

  upsertQuickFeedback: (
    promptId: string,
    params: UpsertQuickFeedbackRequestBodyType
  ) => {
    const callAPI = createApiCaller(
      `${PROMPTS_API_URL}/${promptId}/quick-feedback`,
      {
        method: "PATCH",
        errorMessagePrefix: "Failed to update quick feedback",
      }
    );

    return callAPI(params) as Promise<UpsertQuickFeedbackResponseType>;
  },

  getTopLevelComments: (
    promptId: string,
    params: GetTopLevelCommentsRequestQueryParams
  ) => {
    const callAPI = createApiCaller(`${PROMPTS_API_URL}/${promptId}/comments`, {
      method: "GET",
      errorMessagePrefix: "Failed to get comments",
    });

    return callAPI(params) as Promise<GetTopLevelCommentsResponseType>;
  },

  getReplies: (
    promptId: string,
    commentId: number,
    params: GetRepliesRequestQueryParams
  ) => {
    const callAPI = createApiCaller(
      `${PROMPTS_API_URL}/${promptId}/comments/${commentId}/replies`,
      {
        method: "GET",
        errorMessagePrefix: "Failed to get replies",
      }
    );

    return callAPI(params) as Promise<GetRepliesResponseType>;
  },

  postComment: (promptId: string, params: PostCommentRequestBodyType) => {
    const callAPI = createApiCaller(`${PROMPTS_API_URL}/${promptId}/comments`, {
      method: "POST",
      errorMessagePrefix: "Failed to post comment",
    });

    return callAPI(params) as Promise<PostCommentResponseType>;
  },

  postReply: (
    promptId: string,
    commentId: number,
    params: PostReplyRequestBodyType
  ) => {
    const callAPI = createApiCaller(
      `${PROMPTS_API_URL}/${promptId}/comments/${commentId}/replies`,
      {
        method: "POST",
        errorMessagePrefix: "Failed to post reply",
      }
    );

    return callAPI(params) as Promise<PostReplyResponseType>;
  },

  checkByHash: (params: {
    fullPromptCID: string;
    fullPromptSHA256: string;
    promptSetId?: number;
  }) => {
    const callAPI = createApiCaller(`${PROMPTS_API_URL}/check-by-hash`, {
      method: "GET",
      errorMessagePrefix: "Failed to check prompt",
    });

    return callAPI(params) as Promise<CheckByHashResponseType>;
  },

  getStatuses: (params: GetStatusRequestBodyType) => {
    const callAPI = createApiCaller(`${PROMPTS_API_URL}/status`, {
      method: "POST",
      errorMessagePrefix: "Failed to get statuses",
    });

    return callAPI(params) as Promise<GetStatusResponseType>;
  },
};

export function usePromptAPI() {
  return api;
}

export type APIPromptItem = Awaited<
  ReturnType<typeof api.getPrompts>
>["data"][number];
export type APIComment = Awaited<
  ReturnType<typeof api.getTopLevelComments>
>["data"][number];
export type APIStatusItem = Awaited<ReturnType<typeof api.getStatuses>>[number];
