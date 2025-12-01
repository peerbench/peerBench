"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/loading-spinner";
import { LucideBell, LucideLoader2 } from "lucide-react";
import { useInfiniteNotifications } from "@/lib/react-query/use-infinite-notifications";
import { NotificationCard } from "@/components/notification-card";
import { useRouter } from "next/navigation";
import {
  APINotificationItem,
  useProfileAPI,
} from "@/lib/hooks/use-profile-api";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types/db";
import { NotificationTypes } from "@/database/types";

export default function NotificationsPage() {
  const router = useRouter();
  const profileAPI = useProfileAPI();
  const queryClient = useQueryClient();
  const [
    {
      data: notifications,
      isLoading,
      isFetchingNextPage,
      isReachingEnd,
      isEmpty,
      loadingRef,
      error,
    },
    queryKey,
  ] = useInfiniteNotifications(
    { pageSize: 10 },
    {
      enableInfiniteScroll: true,
      autoLoadNextPage: false,
    }
  );

  const handleNotificationClick = (notification: APINotificationItem) => {
    if (notification.type === NotificationTypes.promptComment) {
      router.push(`/prompts/${notification.metadata.promptId}`);
    }
  };

  const handleNotificationHover = (notification: APINotificationItem) => {
    if (notification.readAt !== null) {
      return;
    }

    // Update the cache as read without refetching the data
    queryClient.setQueryData(
      queryKey,
      (prev: InfiniteData<PaginatedResponse<APINotificationItem>>) => {
        return {
          ...prev,
          pages: prev?.pages?.map((page) => ({
            ...page,
            data: page.data.map((item) => {
              if (item.id === notification.id) {
                return { ...item, readAt: new Date().toISOString() };
              }
              return item;
            }),
          })),
        } satisfies typeof prev;
      }
    );

    // Update the data on the server
    profileAPI
      .readNotification(notification.id)
      .catch((err) => console.error(err));
  };

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-8">
          <LoadingSpinner position="block" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12 text-red-500">
          <p className="text-lg font-medium">Error loading notifications</p>
          <p className="text-sm text-gray-600 mt-2">
            Something went wrong. Please try again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <LucideBell className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Notifications
          </h1>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          )}
        </div>

        {/* Notifications List */}
        {isEmpty ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LucideBell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-2">
                You&apos;ll see notifications here when you receive comments,
                feedback, or mentions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                type={notification.type}
                content={notification.content}
                metadata={notification.metadata}
                readAt={notification.readAt}
                createdAt={notification.createdAt}
                onClick={() => handleNotificationClick(notification)}
                onHover={() => handleNotificationHover(notification)}
              />
            ))}

            {/* Loading indicator for infinite scroll */}
            <div ref={loadingRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-gray-500">
                  <LucideLoader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading more notifications...</span>
                </div>
              )}
              {isReachingEnd && notifications.length > 0 && (
                <p className="text-sm text-gray-500">
                  No more notifications to load
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
