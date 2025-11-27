"use client";

import { QuickFeedbackOpinion, QuickFeedbackOpinions } from "@/database/types";
import { Button } from "./ui/button";
import { useState } from "react";
import { LucideLoader2, LucideThumbsDown, LucideThumbsUp, Info } from "lucide-react";
import { cn } from "@/utils/cn";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

type BaseFeedback = {
  opinion: QuickFeedbackOpinion;
};

export interface QuickFeedbackButtonsProps<TFeedback extends BaseFeedback> {
  userQuickFeedback?: TFeedback | null;
  entityName?: string;
  onQuickFeedbackClick: (opinion: QuickFeedbackOpinion) => Promise<void>;
}

export function QuickFeedbackButtons<TFeedback extends BaseFeedback>({
  userQuickFeedback,
  entityName,
  onQuickFeedbackClick,
}: QuickFeedbackButtonsProps<TFeedback>) {
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);
  const [opinion, setOpinion] = useState<QuickFeedbackOpinion | null>(null);

  const handleQuickFeedbackClick = async (newOpinion: QuickFeedbackOpinion) => {
    if (isUpdatingFeedback || newOpinion === userQuickFeedback?.opinion) return;

    setIsUpdatingFeedback(true);
    onQuickFeedbackClick(newOpinion)
      .then(() => setOpinion(newOpinion)) // When it is successful, immediately update the current state
      .finally(() => setIsUpdatingFeedback(false));
  };

  const getTooltipText = (opinion: "positive" | "negative") => {
    const entity = entityName?.toLowerCase();
    
    if (opinion === "positive") {
      switch (entity) {
        case "prompt":
          return "If the prompt is clear and logically coherent while the expected answer correct";
        case "response":
          return "If the response correctly answers the prompt";
        case "score":
          return "If the score accurately reflects the quality of the response";
        default:
          return "";
      }
    } else {
      switch (entity) {
        case "prompt":
          return "If either the expected answer is wrong or the prompt itself is lacking crucial information, illogical or doesn't contain clear instructions / coherent question.";
        case "response":
          return "If the response is incorrect, irrelevant, or fails to properly address the prompt";
        case "score":
          return "If the score is inaccurate or doesn't properly evaluate the response quality";
        default:
          return "";
      }
    }
  };

  const positiveTooltip = getTooltipText("positive");
  const negativeTooltip = getTooltipText("negative");

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant="outline"
        className={cn(
          "hover:bg-green-50 hover:text-green-600",
          (opinion ?? userQuickFeedback?.opinion) ===
            QuickFeedbackOpinions.positive && "bg-green-50 text-green-600"
        )}
        onClick={() => handleQuickFeedbackClick(QuickFeedbackOpinions.positive)}
        disabled={isUpdatingFeedback}
      >
        {isUpdatingFeedback ? (
          <LucideLoader2 size={24} className="animate-spin" />
        ) : (
          <LucideThumbsUp size={24} />
        )}
        Good {entityName}
        {positiveTooltip && (
          <Tooltip>
            <TooltipTrigger
              asChild
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div>
                <Info className="w-4 h-4 ml-1 opacity-60 cursor-help" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {positiveTooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </Button>
      <Button
        variant="outline"
        className={cn(
          "hover:bg-red-50 hover:text-red-600",
          (opinion ?? userQuickFeedback?.opinion) ===
            QuickFeedbackOpinions.negative && "bg-red-50 text-red-600"
        )}
        onClick={() => handleQuickFeedbackClick(QuickFeedbackOpinions.negative)}
        disabled={isUpdatingFeedback}
      >
        {isUpdatingFeedback ? (
          <LucideLoader2 size={24} className="animate-spin" />
        ) : (
          <LucideThumbsDown size={24} />
        )}
        Bad {entityName}
        {negativeTooltip && (
          <Tooltip>
            <TooltipTrigger
              asChild
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div>
                <Info className="w-4 h-4 ml-1 opacity-60 cursor-help" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {negativeTooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </Button>
    </div>
  );
}
