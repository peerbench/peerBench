"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { LucideSend, LucideLoader2, LucideX } from "lucide-react";
import { errorMessage } from "@/utils/error-message";
import { toast } from "react-toastify";
import { useCommentsContext } from "./context";

export interface CommentFormProps {
  /**
   * Don't use, only for internal usage
   */
  isReply?: boolean;
  parentCommentId?: number;
  placeholder?: string;
  onCommentAdded?: () => void;
  onCancel?: () => void;
  className?: string;
  showConditionally?: boolean;
}

export function CommentForm({
  onCancel,
  isReply = false,
  parentCommentId,
  placeholder = "Write a comment...",
  onCommentAdded,
  className = "mt-4",
  showConditionally = false,
}: CommentFormProps) {
  const {
    idValue,
    postComment,
    postReply,
    showCommentForm,
    setShowCommentForm,
    mutate,
  } = useCommentsContext();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isReply && parentCommentId && postReply) {
        await postReply(idValue, parentCommentId, {
          content: content.trim(),
        });
      } else {
        await postComment(idValue, {
          content: content.trim(),
        });
      }

      toast.success("Comment posted successfully");

      // Revalidate top-level comments if this is a new comment (not a reply)
      if (!isReply) {
        mutate(undefined, { revalidate: true, populateCache: false });
      }

      // Handle form state for conditional display
      if (showConditionally) {
        setShowCommentForm(false);
      }

      onCommentAdded?.();
      setContent("");
    } catch (error) {
      console.error(error);
      toast.error(
        `Failed to post ${isReply ? "reply" : "comment"}: ${errorMessage(error)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent("");

    // Handle form state for conditional display
    if (showConditionally) {
      setShowCommentForm(false);
    }

    onCancel?.();
  };

  // Conditional rendering for top-level comments
  if (showConditionally && !showCommentForm) {
    return null;
  }

  return (
    <div className={className}>
      <Card className="w-full">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
              autoFocus
            />

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {content.length}/1000 characters
              </div>

              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    <LucideX className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={!content.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LucideLoader2 className="w-3 h-3 mr-1 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <LucideSend className="w-3 h-3 mr-1" />
                      {isReply ? "Reply" : "Comment"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
