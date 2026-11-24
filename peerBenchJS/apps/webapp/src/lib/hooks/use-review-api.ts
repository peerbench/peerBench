import {
  ResponseType as PostResponseType,
  RequestBodyParams as PostRequestBodyParams,
} from "@/app/api/v1/review/post";
import {
  ResponseType as PatchResponseType,
  RequestBodyParams as PatchRequestBodyParams,
} from "@/app/api/v1/review/patch";
import { tryReadResponse } from "@/utils/try-read-response";

export function useReviewAPI() {
  return {
    /**
     * Saves a new review
     */
    saveReview: async (data: PostRequestBodyParams) => {
      const response = await fetch("/api/v1/review", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save review: ${await tryReadResponse(response, "Unknown error")}`
        );
      }

      return response.json() as Promise<PostResponseType>;
    },

    /**
     * Updates an existing review
     */
    updateReview: async (data: PatchRequestBodyParams) => {
      const response = await fetch("/api/v1/review", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update review: ${await tryReadResponse(response, "Unknown error")}`
        );
      }

      return response.json() as Promise<PatchResponseType>;
    },
  };
}
