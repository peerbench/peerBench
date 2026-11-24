import { createApiCaller } from "@/utils/client/create-api-caller";
import {
  RequestQueryParams as GetProfileRequestQueryParams,
  ResponseType as GetProfileResponseType,
} from "@/app/api/v2/profile/get";
import {
  RequestBodyParams as PatchProfileRequestBodyParams,
  ResponseType as PatchProfileResponseType,
} from "@/app/api/v2/profile/patch";
import { API_PROFILE } from "../api-endpoints";

const api = {
  getProfile: createApiCaller<
    GetProfileRequestQueryParams,
    GetProfileResponseType
  >(API_PROFILE, {
    method: "GET",
    errorMessagePrefix: "Failed to get profile",
  }),
  updateProfile: createApiCaller<
    PatchProfileRequestBodyParams,
    PatchProfileResponseType
  >(API_PROFILE, {
    method: "PATCH",
    errorMessagePrefix: "Failed to update profile",
  }),
};

export function useProfileApi() {
  return api;
}

export type APIUserProfile = GetProfileResponseType;
