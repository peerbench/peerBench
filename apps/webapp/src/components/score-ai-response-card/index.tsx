"use client";

import { ResponseCard, ResponseCardProps } from "@/components/response-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LucideCheck } from "lucide-react";
import RatingButton from "./rating-button";

export type ScoreAIResponseCardProps = ResponseCardProps & {
  value: number;
  onValueChange: (value: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export default function ScoreAIResponseCard({
  response,
  modelInfo,
  startedAt,
  finishedAt,
  score,
  metadata,
  value,
  onValueChange,
  onSubmit,
  disabled = false,
  children,
  isRevealed,
}: ScoreAIResponseCardProps) {
  const handleRatingClick = (rating: number) => {
    const score = rating / 10; // Convert 1-10 to 0.1-1.0
    onValueChange(score);
  };

  return (
    <ResponseCard
      isRevealed={isRevealed}
      response={response}
      modelInfo={modelInfo}
      startedAt={startedAt}
      finishedAt={finishedAt}
      score={score}
      metadata={metadata}
    >
      {children}
      <ResponseCard.Footer>
        <div className="flex p-7 flex-col gap-4 border-t border-gray-100">
          <div className="space-y-4">
            {/* Rating Buttons and Exact Score Input */}
            <div className="flex flex-col gap-4 items-center">
              <Label className="text-md font-bold">Score</Label>

              {/* Rating Buttons */}
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                  const score = rating / 10;
                  return (
                    <RatingButton
                      key={rating}
                      rating={rating}
                      score={score}
                      value={value}
                      onClick={handleRatingClick}
                      disabled={disabled}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onSubmit}
              disabled={disabled}
              className="w-fit"
              size="lg"
            >
              <LucideCheck className="w-4 h-4 mr-2" />
              Submit Score
            </Button>
          </div>
        </div>
      </ResponseCard.Footer>
    </ResponseCard>
  );
}
