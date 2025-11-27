import { PromptService } from "@/services/prompt.service";
import type { SearchParams } from "../../page";
import PromptNotFound from "../prompt-not-found";
import { PromptStatuses } from "@/database/types";
import PromptResponses from "@/components/prompt-responses";
import FeedbackWithOverlay from "../feedback-with-overlay";
import { PromptComments } from "@/components/prompt-comments";

export interface SectionsProps {
  filters: SearchParams;
  userId: string;
}

export default async function Sections({ filters, userId }: SectionsProps) {
  const {
    data: [prompt],
  } = await PromptService.getPrompts({
    page: 1,
    pageSize: 1,
    requestedByUserId: userId,
    orderBy: {
      feedbackPriority: "asc",
    },
    filters: {
      excludeReviewedByUserId: userId, // Only show prompts the user hasn't reviewed yet
      status: [PromptStatuses.included], // Don't list excluded Prompts

      promptSetId:
        filters.promptSetId !== undefined ? [filters.promptSetId] : undefined,
      tags: filters.tags,
      type: filters.type,
      uploaderId: filters.uploaderId,
      reviewedByUserId: filters.reviewedByUserId,
      minAvgScore: filters.minAvgScore,
      maxAvgScore: filters.maxAvgScore,
      minScoreCount: filters.minScoreCount,
      maxScoreCount: filters.maxScoreCount,
      minBadScoreCount: filters.minBadScoreCount,
      maxBadScoreCount: filters.maxBadScoreCount,
      minGoodScoreCount: filters.minGoodScoreCount,
      maxGoodScoreCount: filters.maxGoodScoreCount,
      badScoreThreshold: filters.badScoreThreshold,
      goodScoreThreshold: filters.goodScoreThreshold,
      minReviewsCount: filters.minReviewsCount,
      maxReviewsCount: filters.maxReviewsCount,
      minPositiveReviewsCount: filters.minPositiveReviewsCount,
      maxPositiveReviewsCount: filters.maxPositiveReviewsCount,
      minNegativeReviewsCount: filters.minNegativeReviewsCount,
      maxNegativeReviewsCount: filters.maxNegativeReviewsCount,
    },
  });

  if (!prompt) {
    return <PromptNotFound />;
  }

  return (
    <>
      <FeedbackWithOverlay promptId={prompt.id} prompt={prompt} />
      <div className="space-y-2">
        <PromptComments
          promptId={prompt.id}
          variant="accordion"
          defaultOpen={false}
        />
        <PromptResponses
          promptId={prompt.id}
          promptAnswer={prompt.answer}
          promptAnswerKey={prompt.answerKey}
          promptType={prompt.type}
          variant="accordion"
          defaultOpen={false}
        />
      </div>
      <div className="h-48 bg-blue-50 mb-12"></div>
    </>
  );
}
