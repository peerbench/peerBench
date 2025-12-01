import { createApiCaller } from "@/utils/client/create-api-caller";
import {
  RequestQueryParams as GetProfileRequestQueryParams,
  ResponseType as GetProfileResponseType,
} from "@/app/api/v2/profile/get";
import {
  RequestBodyParams as PatchProfileRequestBodyParams,
  ResponseType as PatchProfileResponseType,
} from "@/app/api/v2/profile/patch";
import {
  RequestQueryParams as GetNotificationsRequestQueryParams,
  ResponseType as GetNotificationsResponseType,
} from "@/app/api/v2/profile/notifications/get";
import { ResponseType as ReadNotificationResponseType } from "@/app/api/v2/profile/notifications/[id]/read/patch";
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
  getNotifications: createApiCaller<
    GetNotificationsRequestQueryParams,
    GetNotificationsResponseType
  >(`${API_PROFILE}/notifications`, {
    method: "GET",
    errorMessagePrefix: "Failed to get notifications",
  }),

  readNotification: (id: number) => {
    const callAPI = createApiCaller<
      Record<string, never>,
      ReadNotificationResponseType
    >(`${API_PROFILE}/notifications/${id}/read`, {
      method: "PATCH",
      errorMessagePrefix: "Failed to read notification",
    });

    return callAPI({}) as Promise<ReadNotificationResponseType>;
  },
};

export function useProfileAPI() {
  return api;
}

export type APIUserProfile = GetProfileResponseType;
export type APINotificationItem = Awaited<
  ReturnType<typeof api.getNotifications>
>["data"][number];
