import { LucideLoader2 } from "lucide-react";
import { NavigationControls } from "../navigation-controls";
import { InfoSection } from "../entity-preview/info-section";
import { InfoField } from "../entity-preview/info-field";
import { DateTime } from "luxon";
import { JSONView } from "../json-view";
import { formatUsd } from "@/utils/format-usd";
import { formatMs, PromptResponse } from "peerbench";
import Decimal from "decimal.js";

export function Content({
  isLoading,
  responses,
  currentIndex,
  onPrevious,
  onNext,
}: {
  isLoading: boolean;
  responses: PromptResponse[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const safeIndex = Math.min(currentIndex, Math.max(0, responses.length - 1));
  const currentResponse = responses[safeIndex];
  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <LucideLoader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading responses...</p>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No responses available</p>
        </div>
      ) : currentResponse ? (
        <div className="space-y-4">
          <NavigationControls
            currentIndex={safeIndex}
            total={responses.length}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Model Information */}
            <InfoSection title="Model Information">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField label="Provider" value={currentResponse.provider} />
                <InfoField label="Model" value={currentResponse.modelSlug} />
              </div>
            </InfoSection>

            {/* Timestamps */}
            <InfoSection title="Timing">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoField
                  label="Started"
                  value={DateTime.fromMillis(
                    currentResponse.startedAt
                  ).toFormat("TTT, DD")}
                />
                <InfoField
                  label="Finished"
                  value={DateTime.fromMillis(
                    currentResponse.finishedAt
                  ).toFormat("TTT, DD")}
                />
                <InfoField
                  label="Duration"
                  value={formatMs(
                    currentResponse.finishedAt - currentResponse.startedAt,
                    {
                      full: true,
                      include: ["second", "minute", "hour", "day"],
                    }
                  )}
                  spanFull
                />
              </div>
            </InfoSection>

            {/* Token Usage & Costs */}
            {(currentResponse.inputTokensUsed !== undefined ||
              currentResponse.outputTokensUsed !== undefined ||
              currentResponse.inputCost ||
              currentResponse.outputCost) && (
              <InfoSection title="Usage & Cost">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoField
                    label="Input Tokens"
                    value={
                      currentResponse.inputTokensUsed !== undefined
                        ? currentResponse.inputTokensUsed.toLocaleString()
                        : undefined
                    }
                  />
                  <InfoField
                    label="Output Tokens"
                    value={
                      currentResponse.outputTokensUsed !== undefined
                        ? currentResponse.outputTokensUsed.toLocaleString()
                        : undefined
                    }
                  />
                  <InfoField
                    label="Input Cost"
                    value={
                      currentResponse.inputCost
                        ? formatUsd(new Decimal(currentResponse.inputCost))
                        : undefined
                    }
                  />
                  <InfoField
                    label="Output Cost"
                    value={
                      currentResponse.outputCost
                        ? formatUsd(new Decimal(currentResponse.outputCost))
                        : undefined
                    }
                  />
                </div>
              </InfoSection>
            )}

            {/* Response Data */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Response
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-sans">
                  {currentResponse.response || "No response data"}
                </pre>
              </div>
            </div>

            {/* Metadata */}
            {currentResponse.responseMetadata &&
              Object.keys(currentResponse.responseMetadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Metadata
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                    <JSONView
                      data={currentResponse.responseMetadata}
                      collapsed
                    />
                  </div>
                </div>
              )}

            {/* Identifiers */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>
                <span className="font-medium">Prompt UUID:</span>{" "}
                <span className="font-mono">
                  {currentResponse.prompt.promptUUID}
                </span>
              </div>
              <div>
                <span className="font-medium">UUID:</span>{" "}
                <span className="font-mono">
                  {currentResponse.responseUUID}
                </span>
              </div>
              <div>
                <span className="font-medium">CID:</span>{" "}
                <span className="font-mono">{currentResponse.responseCID}</span>
              </div>
              <div>
                <span className="font-medium">SHA256:</span>{" "}
                <span className="font-mono">
                  {currentResponse.responseSHA256.slice(0, 16)}...
                </span>
              </div>
              <div>
                <span className="font-medium">Run ID:</span>{" "}
                <span className="font-mono">{currentResponse.runId}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
