import type {
  ResponseType as GetResponseType,
  RequestQueryParams as GetRequestQueryParams,
} from "@/app/api/v2/prompt-sets/get";
import type {
  ResponseType as PostResponseType,
  RequestBody as PostRequestBody,
} from "@/app/api/v2/prompt-sets/post";
import type {
  ResponseType as PatchResponseType,
  RequestBody as PatchRequestBody,
} from "@/app/api/v2/prompt-sets/[id]/patch";
import type { ResponseType as DeleteResponseType } from "@/app/api/v2/prompt-sets/[id]/delete";
import type {
  ResponseType as UpdatePromptAssignmentResponseType,
  RequestBody as UpdatePromptAssignmentRequestBody,
} from "@/app/api/v2/prompt-sets/[id]/prompts/[promptId]/patch";
import type {
  ResponseType as GetInvitationsResponseType,
  RequestQueryParams as GetInvitationsRequestQueryParams,
} from "@/app/api/v2/prompt-sets/[id]/invitations/get";
import type {
  ResponseType as CreateInvitationResponseType,
  RequestBody as CreateInvitationRequestBody,
} from "@/app/api/v2/prompt-sets/invite/post";
import type {
  ResponseType as DeleteInvitationResponseType,
  RequestBody as DeleteInvitationRequestBody,
} from "@/app/api/v2/prompt-sets/invite/delete";
import type {
  ResponseType as UseInvitationResponseType,
  RequestBody as UseInvitationRequestBody,
} from "@/app/api/v2/prompt-sets/invite/patch";
import type {
  ResponseType as GetCoauthorsResponseType,
  RequestQueryParams as GetCoauthorsRequestQueryParams,
} from "@/app/api/v2/prompt-sets/[id]/coauthors/get";
import type { ResponseType as DeleteCoauthorResponseType } from "@/app/api/v2/prompt-sets/[id]/coauthors/[coAuthorUserId]/delete";
import type {
  ResponseType as UpdateCoAuthorRoleResponseType,
  RequestBody as UpdateCoAuthorRoleRequestBody,
} from "@/app/api/v2/prompt-sets/[id]/coauthors/[coAuthorUserId]/patch";
import type {
  ResponseType as AssignPromptResponseType,
  RequestBodyType as AssignPromptRequestBody,
} from "@/app/api/v2/prompt-sets/[id]/prompts/assign/post";
import { createApiCaller } from "@/utils/client/create-api-caller";

export const PROMPT_SETS_API_URL = "/api/v2/prompt-sets";
const api = {
  createPromptSet: createApiCaller<PostRequestBody, PostResponseType>(
    PROMPT_SETS_API_URL,
    {
      method: "POST",
      errorMessagePrefix: "Failed to create Benchmark",
    }
  ),

  getPromptSets: createApiCaller<GetRequestQueryParams, GetResponseType>(
    PROMPT_SETS_API_URL,
    {
      method: "GET",
      errorMessagePrefix: "Failed to fetch Benchmarks",
    }
  ),

  updatePromptSet: (id: number, data: PatchRequestBody) => {
    const caller = createApiCaller<PatchRequestBody, PatchResponseType>(
      `${PROMPT_SETS_API_URL}/${id}`,
      {
        method: "PATCH",
        errorMessagePrefix: "Failed to update Benchmark",
      }
    );
    return caller(data) as Promise<PatchResponseType>;
  },

  deletePromptSet: (id: number) => {
    const caller = createApiCaller<Record<string, never>, DeleteResponseType>(
      `${PROMPT_SETS_API_URL}/${id}`,
      {
        method: "DELETE",
        errorMessagePrefix: "Failed to delete Benchmark",
      }
    );
    return caller({}) as Promise<DeleteResponseType>;
  },

  useInvitation: createApiCaller<
    UseInvitationRequestBody,
    UseInvitationResponseType
  >(`${PROMPT_SETS_API_URL}/invite`, {
    method: "PATCH",
    errorMessagePrefix: "Failed to use invitation",
  }),

  updatePromptAssignment: (
    promptSetId: number,
    promptId: string,
    data: UpdatePromptAssignmentRequestBody
  ) => {
    const caller = createApiCaller<
      UpdatePromptAssignmentRequestBody,
      UpdatePromptAssignmentResponseType
    >(`${PROMPT_SETS_API_URL}/${promptSetId}/prompts/${promptId}`, {
      method: "PATCH",
      errorMessagePrefix: "Failed to update prompt assignment",
    });
    return caller(data) as Promise<UpdatePromptAssignmentResponseType>;
  },

  getInvitations: (
    promptSetId: number,
    params?: GetInvitationsRequestQueryParams
  ) => {
    const caller = createApiCaller<
      GetInvitationsRequestQueryParams,
      GetInvitationsResponseType
    >(`${PROMPT_SETS_API_URL}/${promptSetId}/invitations`, {
      method: "GET",
      errorMessagePrefix: "Failed to fetch invitations",
    });
    return caller(params) as Promise<GetInvitationsResponseType>;
  },

  createInvitationCode: createApiCaller<
    CreateInvitationRequestBody,
    CreateInvitationResponseType
  >(`${PROMPT_SETS_API_URL}/invite`, {
    method: "POST",
    errorMessagePrefix: "Failed to create invitation",
  }),

  revokeInvitation: createApiCaller<
    DeleteInvitationRequestBody,
    DeleteInvitationResponseType
  >(`${PROMPT_SETS_API_URL}/invite`, {
    method: "DELETE",
    errorMessagePrefix: "Failed to delete invitation",
  }),

  getCoauthors: (
    promptSetId: number,
    params?: GetCoauthorsRequestQueryParams
  ) => {
    const caller = createApiCaller<
      GetCoauthorsRequestQueryParams,
      GetCoauthorsResponseType
    >(`${PROMPT_SETS_API_URL}/${promptSetId}/coauthors`, {
      method: "GET",
      errorMessagePrefix: "Failed to fetch coauthors",
    });
    return caller(params) as Promise<GetCoauthorsResponseType>;
  },

  removeCoAuthor: (promptSetId: number, coAuthorUserId: string) => {
    const caller = createApiCaller<
      Record<string, never>,
      DeleteCoauthorResponseType
    >(`${PROMPT_SETS_API_URL}/${promptSetId}/coauthors/${coAuthorUserId}`, {
      method: "DELETE",
      errorMessagePrefix: "Failed to remove coauthor",
    });
    return caller({}) as Promise<DeleteCoauthorResponseType>;
  },

  updateCoAuthorRole: (
    promptSetId: number,
    coAuthorUserId: string,
    data: UpdateCoAuthorRoleRequestBody
  ) => {
    const caller = createApiCaller<
      UpdateCoAuthorRoleRequestBody,
      UpdateCoAuthorRoleResponseType
    >(`${PROMPT_SETS_API_URL}/${promptSetId}/coauthors/${coAuthorUserId}`, {
      method: "PATCH",
      errorMessagePrefix: "Failed to update co-author role",
    });
    return caller(data) as Promise<UpdateCoAuthorRoleResponseType>;
  },

  assignPrompt: (promptSetId: number, data: AssignPromptRequestBody) => {
    const caller = createApiCaller<
      AssignPromptRequestBody,
      AssignPromptResponseType
    >(`${PROMPT_SETS_API_URL}/${promptSetId}/prompts/assign`, {
      method: "POST",
      errorMessagePrefix: "Failed to assign prompt to benchmark",
    });
    return caller(data) as Promise<AssignPromptResponseType>;
  },
};

/**
 * A hook that provides functions to interact
 * with the Prompt Set API.
 */
export function usePromptSetAPI() {
  return api;
}

export type CoAuthorItem = Awaited<
  ReturnType<typeof api.getCoauthors>
>["data"][number];

export type InvitationItem = Awaited<
  ReturnType<typeof api.getInvitations>
>["data"][number];

export type NewCreatedPromptSet = Awaited<
  ReturnType<typeof api.createPromptSet>
>;

export type PromptSetItem = Awaited<
  ReturnType<typeof api.getPromptSets>
>["data"][number];
