import {
  ResponseType as EvaluationResponseType,
  RequestBody as EvaluationRequestBody,
} from "@/app/api/v1/scores/post";
import { tryReadResponse } from "@/utils/try-read-response";

/**
 * A hook that provides functions to interact
 * with the Evaluation API for score uploads.
 */
export function useEvaluationAPI() {
  return {
    /**
     * Upload evaluation scores to the database
     */
    uploadScores: async (data: EvaluationRequestBody) => {
      const response = await fetch("/api/v1/scores", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to upload scores: ${await tryReadResponse(response, "Unknown error")}`
        );
      }

      return response.json() as Promise<EvaluationResponseType>;
    },
  };
}
