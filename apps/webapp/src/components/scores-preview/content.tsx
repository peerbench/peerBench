import { LucideLoader2 } from "lucide-react";
import { NavigationControls } from "../navigation-controls";
import { InfoSection } from "../entity-preview/info-section";
import { InfoField } from "../entity-preview/info-field";
import { JSONView } from "../json-view";
import { formatUsd } from "@/utils/format-usd";
import { PromptScore } from "peerbench";
import Decimal from "decimal.js";

export function Content({
  isLoading,
  scores,
  currentIndex,
  onPrevious,
  onNext,
}: {
  isLoading: boolean;
  scores: PromptScore[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const safeIndex = Math.min(currentIndex, Math.max(0, scores.length - 1));
  const currentScore = scores[safeIndex];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <LucideLoader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading scores...</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No scores available</p>
        </div>
      ) : currentScore ? (
        <div className="space-y-4">
          <NavigationControls
            currentIndex={safeIndex}
            total={scores.length}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Score Information */}
            <InfoSection title="Score Information">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField
                  label="Score"
                  value={`${(currentScore.score * 100).toFixed(2)}%`}
                />
                <InfoField label="Method" value={currentScore.method} />
                {currentScore.explanation && (
                  <InfoField
                    label="Explanation"
                    value={currentScore.explanation}
                    spanFull
                    paragraph
                  />
                )}
              </div>
            </InfoSection>

            {/* Scorer AI Information */}
            {currentScore.scorerAIProvider && (
              <InfoSection title="Scorer AI Information">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoField
                    label="Provider"
                    value={currentScore.scorerAIProvider}
                  />
                  <InfoField
                    label="Model"
                    value={currentScore.scorerAIModelSlug || "N/A"}
                  />
                  {currentScore.scorerAIInputTokensUsed !== undefined && (
                    <InfoField
                      label="Input Tokens"
                      value={currentScore.scorerAIInputTokensUsed.toLocaleString()}
                    />
                  )}
                  {currentScore.scorerAIOutputTokensUsed !== undefined && (
                    <InfoField
                      label="Output Tokens"
                      value={currentScore.scorerAIOutputTokensUsed.toLocaleString()}
                    />
                  )}
                  {currentScore.scorerAIInputCost && (
                    <InfoField
                      label="Input Cost"
                      value={formatUsd(
                        new Decimal(currentScore.scorerAIInputCost)
                      )}
                    />
                  )}
                  {currentScore.scorerAIOutputCost && (
                    <InfoField
                      label="Output Cost"
                      value={formatUsd(
                        new Decimal(currentScore.scorerAIOutputCost)
                      )}
                    />
                  )}
                </div>
              </InfoSection>
            )}

            {/* Score Metadata */}
            {currentScore.scoreMetadata &&
              Object.keys(currentScore.scoreMetadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Score Metadata
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                    <JSONView data={currentScore.scoreMetadata} collapsed />
                  </div>
                </div>
              )}

            {/* Identifiers */}
            <InfoSection title="Identifiers">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <InfoField
                  label="Response UUID"
                  value={currentScore.responseUUID}
                  spanFull
                />
                <InfoField
                  label="Score UUID"
                  value={currentScore.scoreUUID}
                  spanFull
                />
                <InfoField label="Run ID" value={currentScore.runId} spanFull />
              </div>
            </InfoSection>
          </div>
        </div>
      ) : null}
    </div>
  );
}
