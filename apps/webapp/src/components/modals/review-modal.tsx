"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReviewOpinion } from "@/types/review";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { MaybePromise } from "peerbench";

export type ReviewModalValue = {
  comment: string;
  opinion: ReviewOpinion | null;
  property?: string | null;
};

export interface ReviewModalProps {
  open?: boolean;
  isLoading?: boolean;
  review?: ReviewModalValue;
  onOpenChange?: (open: boolean) => void;
  onReviewChange?: (review: ReviewModalValue) => void;
  onSubmit?: () => MaybePromise<void>;
  onCancel?: () => void;
}

export function ReviewModal({
  open,
  review,
  isLoading,
  onOpenChange,
  onReviewChange,
  onSubmit,
  onCancel,
}: ReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState(review?.comment || "");
  const [reviewOpinion, setReviewOpinion] = useState<ReviewOpinion | null>(
    review?.opinion || null
  );
  const [property, setProperty] = useState<string | undefined | null>(
    review?.property
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit?.();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to submit review: ${errorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpinionClick = (opinion: ReviewOpinion) => {
    const newOpinion = reviewOpinion === opinion ? null : opinion;
    setReviewOpinion(newOpinion);
    onReviewChange?.({
      ...review,
      comment,
      opinion: newOpinion,
      property,
    });
  };

  const handleReviewTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setComment(e.target.value);
    onReviewChange?.({
      ...review,
      comment: e.target.value,
      opinion: reviewOpinion,
      property,
    });
  };

  useEffect(() => {
    setComment(review?.comment || "");
    setReviewOpinion(review?.opinion || null);
    setProperty(review?.property || null);
  }, [review]);

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Submit a Review</DialogTitle>
              <DialogDescription>
                Please give your detailed feedback
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col gap-4 py-4">
          <div className="grid gap-4 px-2 flex-shrink-0">
            <div className="grid gap-2">
              <label
                htmlFor="review"
                className="text-xs text-gray-600 font-medium"
              >
                Review (optional)
              </label>
              <Textarea
                autoFocus
                id="review"
                placeholder="Your review..."
                value={comment}
                onChange={handleReviewTextChange}
                className="min-h-[100px]"
                disabled={isSubmitting || isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs text-gray-600 font-medium">
                Opinion (required)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={reviewOpinion === "positive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleOpinionClick("positive")}
                  disabled={isLoading || isSubmitting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 ${
                    reviewOpinion === "positive"
                      ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800 dark:hover:bg-green-900/40"
                      : "text-gray-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span className="font-medium">Positive</span>
                </Button>
                <Button
                  variant={reviewOpinion === "negative" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleOpinionClick("negative")}
                  disabled={isLoading || isSubmitting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 ${
                    reviewOpinion === "negative"
                      ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800 dark:hover:bg-red-900/40"
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span className="font-medium">Negative</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reviewOpinion || isSubmitting || isLoading}
          >
            {isSubmitting
              ? "Submitting..."
              : isLoading
                ? "Loading..."
                : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
