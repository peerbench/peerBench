"use client";

import { useState, useMemo, useEffect } from "react";
import { BenchmarkScoringMethods, usePageContext } from "../context";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LucideCheck } from "lucide-react";
import ScoreAIResponseCard from "@/components/score-ai-response-card";
import { ResponseCard } from "@/components/response-card";

export default function ScoreResponses() {
  const ctx = usePageContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0.5);
  const [scoredCount, setScoredCount] = useState(0);
  const [nonScoredResponsesCount, setNonScoredResponsesCount] = useState(0);
  const currentResponse = useMemo(
    () => ctx.results[currentIndex],
    [ctx.results, currentIndex]
  );
  const progress = useMemo(
    () => (scoredCount / nonScoredResponsesCount) * 100,
    [scoredCount, nonScoredResponsesCount]
  );

  const handleScoreSubmit = () => {
    if (currentResponse) {
      ctx.submitHumanScore(currentIndex, score);
      setScoredCount((prev) => prev + 1);

      // Move to next response
      const nextIndex = ctx.results.findIndex(
        (response, i) => i > currentIndex && response.score === undefined
      );

      if (nextIndex === -1) {
        ctx.setAreAllResponsesScored(true);
        return;
      }

      setCurrentIndex(nextIndex);
      setScore(0.5); // Reset score for next response
    }
  };

  useEffect(() => {
    // Reset the state when another test is started
    if (ctx.isRunning) {
      setCurrentIndex(0);
      setScore(0.5);
      setScoredCount(0);
    } else {
      // Set which response to score next once the test is over
      setCurrentIndex(
        ctx.results.findIndex((response) => response.score === undefined)
      );
      setNonScoredResponsesCount(
        ctx.results.filter((response) => response.score === undefined).length
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.isRunning, ctx.setAreAllResponsesScored]);

  if (
    ctx.areAllResponsesScored ||
    ctx.results.length === 0 ||
    ctx.isRunning ||
    ctx.scoringMethod === BenchmarkScoringMethods.none
  ) {
    return null;
  }

  if (!currentResponse) {
    return (
      <Card className="w-full">
        <CardContent className="text-center py-8">
          <div className="text-green-600 mb-2">
            <LucideCheck className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">All Done!</h3>
          <p className="text-gray-600">
            All responses have been scored successfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScoreAIResponseCard
      response={currentResponse.response.response}
      modelInfo={{
        modelId: currentResponse.response.modelSlug,
        provider: currentResponse.response.provider,
      }}
      startedAt={new Date(currentResponse.response.startedAt).toISOString()}
      finishedAt={new Date(currentResponse.response.finishedAt).toISOString()}
      score={currentResponse.score?.score}
      metadata={currentResponse.response.responseMetadata}
      value={score}
      isRevealed={true}
      onValueChange={setScore}
      onSubmit={handleScoreSubmit}
    >
      <ResponseCard.Header>
        <div className="space-y-4 pt-6 px-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span className="text-sm text-gray-600">
                {scoredCount} of {nonScoredResponsesCount} responses needs to be
                scored
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm text-gray-600">
              {nonScoredResponsesCount - scoredCount} responses remaining
            </div>
          </div>
        </div>
      </ResponseCard.Header>
    </ScoreAIResponseCard>
  );
}
