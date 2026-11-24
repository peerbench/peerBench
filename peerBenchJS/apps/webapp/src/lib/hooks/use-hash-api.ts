import {
  RequestBodyType as PostRequestBodyType,
  ResponseType as PostResponseType,
} from "@/app/api/v2/hashes/post";
import { createApiCaller } from "@/utils/client/create-api-caller";

const HASHES_API_URL = "/api/v2/hashes";

const api = {
  postHashes: createApiCaller<PostRequestBodyType, PostResponseType>(
    HASHES_API_URL,
    {
      method: "POST",
      errorMessagePrefix: "Failed to upload hashes",
    }
  ),
};

export function useHashAPI() {
  return api;
}
