"use client";

import { QuickFeedbackOpinion } from "@/database/types";
import { GetPromptsReturnItem } from "@/services/prompt.service";
import { toast } from "react-toastify";
import { upsertQuickFeedback } from "../../actions/upsert-quick-feedback";
import { QuickFeedbackButtons } from "@/components/quick-feedback-buttons";

export interface FeedbackButtonsProps {
  userFeedback: GetPromptsReturnItem["userQuickFeedback"];
  promptId: string;
}

export function FeedbackButtons({
  userFeedback,
  promptId,
}: FeedbackButtonsProps) {
  const handleUpdateFeedback = async (opinion: QuickFeedbackOpinion) => {
    await upsertQuickFeedback(promptId, opinion)
      .then(() => toast.success("Feedback submitted"))
      .catch((err) => {
        toast.error("Failed to submit feedback");
        console.error(err);
      });
  };

  return (
    <QuickFeedbackButtons
      entityName="Prompt"
      userQuickFeedback={userFeedback}
      onQuickFeedbackClick={handleUpdateFeedback}
    />
  );
}
