import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInfiniteAPI } from "@/lib/hooks/use-infinite-api";
import { APIResponseItem } from "@/lib/hooks/use-responses-api";
import { useScoreAPI } from "@/lib/hooks/use-score-api";
import { SWR_GET_SCORES } from "@/lib/swr/keys";
import { DateTime } from "luxon";
import {
  LucideBuilding2,
  LucideClock,
  LucideHash,
  LucideLoader2,
} from "lucide-react";
import { ScoreCard } from "./score-card";
import { QuickFeedbackOpinion } from "@/database/types";
import { toast } from "react-toastify";
import { MarkdownTruncatedText } from "@/components/markdown-truncated-text";
import { ResponseComments } from "../response-comments";

const PAGE_SIZE = 10;

export interface ScoresModalProps {
  response: APIResponseItem | null;
  isOpen: boolean;
  onClose: () => void;
  showComments?: boolean;
  promptAnswer?: string | null;
  promptAnswerKey?: string | null;
  promptType?: string | null;
}

export function ScoresModal({
  response,
  isOpen,
  onClose,
  showComments = true,
  promptAnswer,
  promptAnswerKey,
  promptType,
}: ScoresModalProps) {
  const { getScores, upsertQuickFeedback } = useScoreAPI();

  const {
    data: scores,
    isFirstPageLoading,
    loadMore,
    isReachingEnd,
    isLoadingMore,
    mutate,
  } = useInfiniteAPI({
    getKey: (index) =>
      response
        ? SWR_GET_SCORES(index, {
            responseId: response.id,
            pageSize: PAGE_SIZE,
          })
        : null,
    fetcher: (params) => getScores(params.query),
    swrConfig: {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  });

  const handleQuickFeedbackClick = async (
    scoreId: string,
    opinion: QuickFeedbackOpinion
  ) => {
    await upsertQuickFeedback(scoreId, { opinion });
    mutate(undefined, { revalidate: true, populateCache: false });

    toast.success("Feedback submitted");
  };

  if (!response) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full md:min-w-3xl xl:min-w-7xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scoring Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Response Info Card */}
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">
                    {response.modelId || "Unknown Model"}
                  </h3>
                  <div className="flex gap-1 items-center text-xs text-gray-500">
                    <LucideHash size={12} />
                    {response.id}
                  </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-500 mt-1">
                  <div className="flex gap-2 items-center">
                    <LucideBuilding2 size={16} />
                    {`${response.provider}`}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 font-semibold text-right">
                {response.avgScore !== undefined && (
                  <div className="text-lg">
                    Avg. Score: {response.avgScore.toFixed(2)}
                  </div>
                )}
                {response.totalScoreCount !== undefined && (
                  <div className="text-sm text-gray-500">
                    Scored {response.totalScoreCount} times
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
              {response.startedAt && response.finishedAt && (
                <div className="flex gap-2 items-center">
                  <LucideClock size={14} />
                  <span>
                    {DateTime.fromISO(response.finishedAt).toFormat("TTT, DD")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Response Comments Section */}
          <ResponseComments responseId={response.id} />

          {/* Expected Answer Section */}
          {promptAnswer && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                Expected Correct Answer
              </h4>
              {promptType === "multiple-choice" && promptAnswerKey && (
                <div className="mb-2">
                  <span className="font-bold text-lg text-green-900 dark:text-green-200">
                    {promptAnswerKey.toUpperCase()}
                  </span>
                </div>
              )}
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
                {promptAnswer}
              </pre>
            </div>
          )}

          {/* AI Response Section */}
          {response.isRevealed ? (
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                AI Response
              </h4>
              <MarkdownTruncatedText
                text={response.data || ""}
                maxLength={250}
                className="text-sm text-gray-800 dark:text-gray-200"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50 border-gray-200 italic">
              Response not revealed yet
            </div>
          )}
          {/* Scores List */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Individual Scores</h4>

            {isFirstPageLoading ? (
              <div className="flex items-center justify-center py-8">
                <LucideLoader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : scores.length > 0 ? (
              <div className="space-y-2">
                {scores.map((scoreInfo) => (
                  <ScoreCard
                    key={scoreInfo.id}
                    scoreInfo={scoreInfo}
                    onQuickFeedbackClick={(opinion) =>
                      handleQuickFeedbackClick(scoreInfo.id, opinion)
                    }
                    showComments={showComments}
                  />
                ))}

                {!isReachingEnd && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      variant="outline"
                      className="min-w-32"
                    >
                      {isLoadingMore ? (
                        <>
                          <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No scores available yet
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
