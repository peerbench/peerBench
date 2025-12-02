"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LucideBell, LucideLoader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useProfileAPI,
  APINotificationItem,
} from "@/lib/hooks/use-profile-api";
import { QK_NOTIFICATIONS } from "@/lib/react-query/query-keys";
import { NotificationCard } from "@/components/notification-card";
import { NotificationTypes } from "@/database/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginatedResponse } from "@/types/db";

export function Notifications() {
  const router = useRouter();
  const profileAPI = useProfileAPI();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [QK_NOTIFICATIONS],
    queryFn: () =>
      profileAPI.getNotifications({
        unreadOnly: true,
        page: 1,
        pageSize: 20,
      }),
  });
  const notifications = data?.data || [];
  const unreadCount = data?.pagination?.totalCount ?? 0;

  const handleNotificationClick = (notification: APINotificationItem) => {
    setOpen(false);
    if (notification.type === NotificationTypes.promptComment) {
      router.push(`/prompts/${notification.metadata.promptId}`);
    }
  };
  const handleNotificationHover = (notification: APINotificationItem) => {
    if (notification.readAt !== null) {
      return;
    }

    // Update the cache without refetching the data
    queryClient.setQueryData(
      [QK_NOTIFICATIONS],
      (prev: PaginatedResponse<APINotificationItem>) => {
        return {
          ...prev,
          data: prev.data.map((item) => {
            if (item.id === notification.id) {
              return { ...item, readAt: new Date().toISOString() };
            }
            return item;
          }),
        };
      }
    );

    // Update the data on the server
    profileAPI
      .readNotification(notification.id)
      .catch((err) => console.error(err));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex duration-300 transition-colors p-2 rounded-md items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-gray-200 dark:hover:text-gray-300 hover:cursor-pointer">
          <LucideBell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-[400px] max-w-[500px] max-h-[600px] overflow-y-auto bg-white dark:bg-gray-800 rounded-md p-1 shadow-lg border border-gray-200 dark:border-gray-700 z-[110]"
        sideOffset={5}
        align="end"
      >
        <div className="px-3 py-2 ">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LucideLoader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-center text-sm text-red-500">
            Failed to load notifications
          </div>
        ) : notifications.length === 0 ? (
          <Card className="m-2 border-0 shadow-none">
            <CardContent className="py-8 text-center">
              <LucideBell className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No unread notifications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="py-4 space-y-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="px-2">
                <NotificationCard
                  type={notification.type}
                  content={notification.content}
                  metadata={notification.metadata}
                  readAt={notification.readAt}
                  createdAt={notification.createdAt}
                  variant="compact"
                  onClick={() => handleNotificationClick(notification)}
                  onHover={() => handleNotificationHover(notification)}
                />
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="my-1" />

        <div className="px-2 py-2">
          <Link
            href="/profile/notifications"
            onClick={() => setOpen(false)}
            className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
