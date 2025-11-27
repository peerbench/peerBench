"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LucideUser,
  LucideCalendar,
  LucideChevronDown,
  LucideChevronUp,
  LucideLoader2,
  LucideReply,
} from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { useInfiniteAPI } from "@/lib/hooks/use-infinite-api";
import { useCallback } from "react";
import Link from "next/link";
import { CommentForm } from "./comment-form";
import { CommentData, useCommentsContext } from "./context";

const MAX_REPLIES_PER_PAGE = 5;

export interface CommentCardProps<T extends CommentData> {
  comment: T;
  depth?: number;
  onNewReplyAdded?: () => void;
  className?: string;
}

export function CommentCard<T extends CommentData>({
  comment,
  depth = 0,
  onNewReplyAdded,
  className = "",
}: CommentCardProps<T>) {
  const { idValue, getReplies, swrKeyGenerator } = useCommentsContext();
  const [isShowingReplies, setIsShowingReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const getSWRKey = useCallback(
    (pageIndex: number) =>
      swrKeyGenerator(idValue, comment.id, {
        page: pageIndex + 1,
        pageSize: MAX_REPLIES_PER_PAGE,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idValue, comment.id, comment.replyCount] // Refetch when reply count changes
  );

  const {
    data: replies,
    isLoading,
    loadMore,
    hasNextPage,
    isReachingEnd,
    mutate,
  } = useInfiniteAPI({
    getKey: getSWRKey,
    fetcher: (params) => getReplies(idValue, comment.id, params.query),
    autoLoadNextPage: false,
    enableInfiniteScroll: false,
    swrConfig: {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  });

  const handleExpandToggle = () => {
    setIsShowingReplies(!isShowingReplies);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isReachingEnd) {
      loadMore();
    }
  };

  const handleReply = () => {
    setShowReplyForm(true);
  };

  const handleReplyCancel = () => {
    setShowReplyForm(false);
  };

  const handleNewReplyAdded = () => {
    mutate(undefined, { revalidate: true, populateCache: false });
    setShowReplyForm(false);
    setIsShowingReplies(true);
    onNewReplyAdded?.();
  };

  return (
    <div className={`w-full ${depth > 0 ? "pl-6" : ""}`}>
      <Card
        className={`w-full ${depth > 0 ? "border-l-4 border-l-blue-100" : ""} ${className}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <LucideUser size={16} className="text-gray-500" />
            </div>
            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              {/* User Info and Timestamp */}
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/profile/${comment.userId}`}
                  className="flex items-center gap-1 hover:underline"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {comment.userDisplayName || "[No Name]"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    ({comment.userId})
                  </span>
                </Link>

                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <LucideCalendar className="w-3 h-3" />
                  <span>
                    {DateTime.fromISO(
                      comment.createdAt.toString()
                    ).toRelative()}
                  </span>
                </div>
              </div>

              {/* Comment Content */}
              <div className="mb-3">
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                {comment.replyCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExpandToggle}
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    {isShowingReplies ? (
                      <>
                        <LucideChevronUp className="w-3 h-3 mr-1" />
                        Hide replies
                      </>
                    ) : (
                      <>
                        <LucideChevronDown className="w-3 h-3 mr-1" />
                        Show replies ({comment.replyCount})
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex-1" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReply}
                  className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 
                    dark:hover:text-gray-100"
                >
                  <LucideReply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-3 ml-12">
          <CommentForm
            isReply={true}
            parentCommentId={comment.id}
            onCommentAdded={handleNewReplyAdded}
            onCancel={handleReplyCancel}
            placeholder={`Reply to ${comment.userDisplayName || "[No Name]"}...`}
          />
        </div>
      )}

      {/* Replies Section */}
      {isShowingReplies && (
        <div className="mt-4 space-y-4">
          {isLoading && replies.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <LucideLoader2 className="w-4 h-4 animate-spin text-gray-600 mr-2" />
              <span className="text-sm text-gray-600">Loading replies...</span>
            </div>
          ) : (
            <>
              {/* Render Replies */}
              {(replies as T[]).map((reply: T) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  onNewReplyAdded={handleNewReplyAdded}
                />
              ))}

              {/* Load More Button */}
              {hasNextPage && !isReachingEnd && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {isLoading ? (
                      <>
                        <LucideLoader2 className="w-3 h-3 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more replies"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
