"use client";

import { Button } from "@/components/ui/button";
import {
  LucideLoader2,
  LucideMessageSquare,
  LucideRefreshCcw,
} from "lucide-react";
import { useCommentsContext } from "./context";
import { CommentCard } from "./comment-card";

export interface EntriesProps {
  showNoCommentsMessage?: boolean;
  className?: string;
}

export function Entries({
  showNoCommentsMessage = true,
  className = "",
}: EntriesProps) {
  const {
    topLevelComments,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    showCommentForm,

    loadMore,
    mutate,
  } = useCommentsContext();

  const handleNewReplyAdded = () => {
    mutate(undefined, { revalidate: true, populateCache: false });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-3">
        <LucideLoader2 className="w-8 h-8 animate-spin text-gray-600" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topLevelComments.length === 0 &&
        isReachingEnd &&
        !showCommentForm &&
        showNoCommentsMessage && (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
            <LucideMessageSquare size={48} />
            <div>No comments found yet. Be the first to comment!</div>
          </div>
        )}

      {topLevelComments.map((comment) => (
        <CommentCard
          key={comment.id}
          className={className}
          comment={comment}
          onNewReplyAdded={handleNewReplyAdded}
        />
      ))}

      {/* Load More Button */}
      {!isReachingEnd && topLevelComments.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <LucideLoader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <LucideRefreshCcw className="w-4 h-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
