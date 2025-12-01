import { RequestQueryParams as GetNotificationsRequestQueryParams } from "@/app/api/v2/profile/notifications/get";
import { APINotificationItem, useProfileAPI } from "../hooks/use-profile-api";
import { QK_NOTIFICATIONS } from "./query-keys";
import { useInfiniteQuery, UseInfiniteQueryParams } from "./use-infinite-query";
import { useMemo } from "react";

export function useInfiniteNotifications(
  params: GetNotificationsRequestQueryParams = {},
  infiniteQueryParams?: Partial<UseInfiniteQueryParams<APINotificationItem>>
) {
  const { getNotifications } = useProfileAPI();
  const queryKey = useMemo(() => [QK_NOTIFICATIONS, params], [params]);

  return [
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) =>
        getNotifications({
          page: pageParam,
          pageSize: params.pageSize ?? 10,
        }),
      initialPageParam: 1,
      ...(infiniteQueryParams || {}),
    }),
    queryKey,
  ] as const;
}
