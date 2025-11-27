"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Info } from "lucide-react";
import { errorMessage } from "@/utils/error-message";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";
import { useRouter } from "next/navigation";
import { QuickFeedbackOpinion } from "@/database/types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from "next/link";

export interface FeedbackProps {
  promptId: string;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

export default function Feedback({ promptId, onSubmittingChange }: FeedbackProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { upsertQuickFeedback } = usePromptAPI();
  const router = useRouter();

  const handleOpinionClick = async (opinion: QuickFeedbackOpinion) => {
    setIsSubmitting(true);
    onSubmittingChange?.(true);

    try {
      // Submit feedback immediately
      await upsertQuickFeedback(promptId, {
        opinion,
      });

      setIsSubmitted(true);
      toast.success(
        <div>
          Feedback submitted successfully!{" "}
          <Link href="/myActivity" className="underline font-semibold">
            View your activity
          </Link>
        </div>
      );

      // Move to next prompt after a brief delay
      setTimeout(() => {
        handleNextPromptClick();
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error(`Failed: ${errorMessage(err)}`);
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  };

  const handleSkipClick = () => {
    handleNextPromptClick();
  };

  const handleNextPromptClick = () => {
    setIsSubmitted(false);
    setIsSubmitting(false);
    onSubmittingChange?.(false);

    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Opinion Selection */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpinionClick("positive")}
              className="flex-1 p-3 h-auto border-green-300 text-green-700 hover:bg-green-50 hover:border-green-300"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">👍</span>
                <span className="font-medium">Good Prompt</span>
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <div>
                      <Info className="w-4 h-4 opacity-60 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    If the prompt is clear and logically coherent while the expected answer correct
                  </TooltipContent>
                </Tooltip>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isSubmitted}
              onClick={handleSkipClick}
              className="flex-1 p-3 h-auto bg-white border-gray-400 hover:border-gray-500"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⏭</span>
                <span className="font-medium">Skip</span>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpinionClick("negative")}
              className="flex-1 p-3 h-auto border-red-300 text-red-700 hover:bg-red-50 hover:border-red-300"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">👎</span>
                <span className="font-medium">Bad Prompt</span>
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <div>
                      <Info className="w-4 h-4 opacity-60 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    If either the expected answer is wrong or the prompt itself is lacking crucial information, illogical or doesn&apos;t contain clear instructions / coherent question.
                  </TooltipContent>
                </Tooltip>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
