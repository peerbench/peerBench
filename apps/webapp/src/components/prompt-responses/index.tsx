"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { useInfiniteAPI } from "@/lib/hooks/use-infinite-api";
import { useResponsesAPI } from "@/lib/hooks/use-responses-api";
import { SWR_GET_RESPONSES } from "@/lib/swr/keys";
import {
  LucideLoader2,
  LucideRefreshCw,
  LucideMessageSquare,
} from "lucide-react";
import { ScoresModal } from "./scores-modal";
import { APIResponseItem } from "@/lib/hooks/use-responses-api";
import { useState, useEffect } from "react";
import { ResponseCard } from "@/components/response-card";
import { ResponseComments } from "./response-comments";
import { QuickFeedbackOpinion } from "@/database/types";
import { toast } from "react-toastify";
import LoadingSpinner from "@/components/loading-spinner";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export interface PromptResponsesProps {
  promptId: string;
  promptAnswer?: string | null;
  promptAnswerKey?: string | null;
  promptType?: string | null;
  variant?: "default" | "accordion";
  defaultOpen?: boolean;
}

export default function PromptResponses({
  promptId,
  promptAnswer,
  promptAnswerKey,
  promptType,
  variant = "default",
  defaultOpen = false,
}: PromptResponsesProps) {
  const { getResponses, upsertQuickFeedback } = useResponsesAPI();
  const [selectedResponse, setSelectedResponse] =
    useState<APIResponseItem | null>(null);
  const [isScoresModalOpen, setIsScoresModalOpen] = useState(false);

  const handleScoreDetailsClick = (response: APIResponseItem) => {
    setSelectedResponse(response);
    setIsScoresModalOpen(true);
    // Update URL hash with response ID
    window.history.pushState(null, "", `#response-${response.id}`);
  };

  const handleCloseScoresModal = () => {
    setIsScoresModalOpen(false);
    setSelectedResponse(null);
    // Remove hash from URL
    window.history.pushState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  };

  const handleQuickFeedbackClick = async (
    responseId: string,
    opinion: QuickFeedbackOpinion
  ) => {
    await upsertQuickFeedback(responseId, { opinion });
    mutate(undefined, { revalidate: true, populateCache: false });

    toast.success("Feedback submitted");
  };

  const {
    data: responses,
    error,
    isFirstPageLoading,
    isValidating,
    totalCount,
    loadMore,
    hasNextPage,
    isLoadingMore,
    mutate,
  } = useInfiniteAPI({
    getKey: (index) => SWR_GET_RESPONSES(index, { promptId, pageSize: 10 }),
    fetcher: (params) => getResponses(params.query),
    swrConfig: {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  });

  // Check for hash in URL on mount and when responses load
  useEffect(() => {
    if (responses.length === 0) return;

    const hash = window.location.hash;
    if (hash.startsWith("#response-")) {
      const responseId = hash.replace("#response-", "");
      const response = responses.find((r) => r.id === responseId);

      if (response && response.totalScoreCount > 0) {
        setSelectedResponse(response);
        setIsScoresModalOpen(true);
      }
    }
  }, [responses]);

  const errorContent = error ? (
    <Card>
      <CardHeader>
        <CardTitle>Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">
            Error loading data: {error.message}
          </p>
          <Button
            onClick={() => mutate(undefined, { revalidate: true })}
            variant="outline"
            className="inline-flex items-center gap-2"
            disabled={isValidating}
          >
            <LucideRefreshCw
              className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`}
            />
            {isValidating ? "Retrying..." : "Try Again"}
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : null;

  const loadingContent = isFirstPageLoading ? (
    <Card>
      <CardHeader>
        <CardTitle>Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <LoadingSpinner position="block" />
        </div>
      </CardContent>
    </Card>
  ) : null;

  if (error) {
    if (variant === "accordion") {
      return (
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultOpen ? "item-1" : undefined}
        >
          <AccordionItem
            value="item-1"
            className="bg-white/60 backdrop-blur-sm"
          >
            <AccordionTrigger>
              <div className="pl-4 flex items-center gap-2">
                <LucideMessageSquare className="w-5 h-5 text-gray-600" />
                <div>Responses (0)</div>
              </div>
            </AccordionTrigger>
            <AccordionContent>{errorContent}</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }
    return errorContent;
  }

  if (isFirstPageLoading) {
    if (variant === "accordion") {
      return (
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultOpen ? "item-1" : undefined}
        >
          <AccordionItem
            value="item-1"
            className="bg-white/60 backdrop-blur-sm"
          >
            <AccordionTrigger>
              <div className="pl-4 flex items-center gap-2">
                <LucideMessageSquare className="w-5 h-5 text-gray-600" />
                <div>Responses</div>
              </div>
            </AccordionTrigger>
            <AccordionContent>{loadingContent}</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }
    return loadingContent;
  }

  const responsesContent = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Responses</CardTitle>
            <p className="text-sm text-gray-600">
              {totalCount ?? "N/A"} response(s) found
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {responses.length === 0 && !isFirstPageLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No data found</p>
              <Button
                variant="outline"
                className="inline-flex items-center gap-2"
                disabled={isValidating}
              >
                <LucideRefreshCw
                  className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`}
                />
                {isValidating ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          ) : (
            <>
              {responses.map((response) => (
                <ResponseCard
                  key={response.id}
                  responseId={response.id}
                  isRevealed={response.isRevealed}
                  response={response.data}
                  modelInfo={{
                    modelId: response.modelId,
                    provider: response.provider,
                  }}
                  startedAt={response.startedAt}
                  finishedAt={response.finishedAt}
                  avgScore={
                    response.totalScoreCount > 0 ? response.avgScore : undefined
                  }
                  systemPrompt={(response.metadata as { systemPrompt?: string })?.systemPrompt ?? null}
                  onScoreDetailsClick={
                    response.totalScoreCount > 0
                      ? () => handleScoreDetailsClick(response)
                      : undefined
                  }
                >
                  <ResponseCard.QuickFeedbackButtons
                    entityName="Response"
                    userQuickFeedback={response.userQuickFeedback}
                    onQuickFeedbackClick={(opinion) =>
                      handleQuickFeedbackClick(response.id, opinion)
                    }
                  />
                  <ResponseCard.Comments>
                    <ResponseComments responseId={response.id} />
                  </ResponseCard.Comments>
                </ResponseCard>
              ))}

              {hasNextPage && (
                <div className="text-center pt-4">
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
            </>
          )}
        </div>
      </CardContent>

      <ScoresModal
        response={selectedResponse}
        isOpen={isScoresModalOpen}
        onClose={handleCloseScoresModal}
        promptAnswer={promptAnswer}
        promptAnswerKey={promptAnswerKey}
        promptType={promptType}
      />
    </Card>
  );

  if (variant === "accordion") {
    return (
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen ? "item-1" : undefined}
      >
        <AccordionItem value="item-1" className="bg-white/60 backdrop-blur-sm">
          <AccordionTrigger>
            <div className="pl-4 flex items-center gap-2">
              <LucideMessageSquare className="w-5 h-5 text-gray-600" />
              <div>Responses ({totalCount ?? 0})</div>
            </div>
          </AccordionTrigger>
          <AccordionContent>{responsesContent}</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return responsesContent;
}
