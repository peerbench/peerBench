"use client";

import { usePageContext } from "../context";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "react-toastify";
import { v7 as uuidv7 } from "uuid";
import {
  buildResponse,
  calculateCID,
  calculateSHA256,
  PromptResponse,
  ScoringMethods,
  stableStringify,
} from "peerbench";
import { errorMessage } from "@/utils/error-message";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";
import { usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { useResponsesAPI } from "@/lib/hooks/use-responses-api";
import { useScoreAPI } from "@/lib/hooks/use-score-api";
import { useModelAPI, RandomModelItem } from "@/lib/hooks/use-model-api";
import { CompareModel } from "../context";
import PromptSetSelect from "@/components/prompt-set-select";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { RefreshCw, Save, Sparkles, Share2 } from "lucide-react";

// Map API ModelInfo to CompareModel
function mapModelToCompareModel(model: RandomModelItem): CompareModel {
  return {
    modelId: model.id, // The slug from API
    name: typeof model.name === "string" ? model.name : null,

    // TODO: Following fields will be deprecated, not actively used anymore
    owner: "unknown",
    host: "unknown",
    // TODO: Currently we only support OpenRouter provider.
    provider: "openrouter.ai",
    elo: null,
  };
}

export default function RatingSection() {
  const ctx = usePageContext();
  const comparison = ctx.currentComparison;
  const promptAPI = usePromptAPI();
  const promptSetAPI = usePromptSetAPI();
  const responseAPI = useResponsesAPI();
  const scoreAPI = useScoreAPI();
  const modelAPI = useModelAPI();

  const [ratingA, setRatingA] = useState<number>(5);
  const [ratingB, setRatingB] = useState<number>(5);
  const [canShowMore, setCanShowMore] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  // Reset ratings when comparison changes
  useEffect(() => {
    if (comparison && !comparison.isRevealed) {
      setRatingA(5);
      setRatingB(5);
    }
  }, [comparison]);

  if (!comparison || !comparison.responseA || !comparison.responseB) {
    return null;
  }

  const handleShowMore = async () => {
    if (!ctx.generatedPrompt) {
      toast.error("No prompt generated");
      return;
    }

    ctx.setIsGenerating(true);
    ctx.setIsDataSaved(false); // Reset saved state for new comparison
    // Keep selectedPromptSet to preserve user's benchmark choice
    const loadingToast = toast.loading("Generating new responses...");

    try {
      // Get model slugs (modelId) of already used models
      const usedModelSlugs = ctx.comparisons.flatMap((c) => [
        c.modelA.modelId,
        c.modelB.modelId,
      ]);

      // Fetch 2 new random models excluding already used ones
      const { data: models } = await modelAPI.getRandomModels({
        count: 2,
        excludeSlugs: usedModelSlugs,
      });

      if (models.length < 2) {
        setCanShowMore(false);
        toast.update(loadingToast, {
          render: "No more models available to compare",
          type: "warning",
          isLoading: false,
          autoClose: 3000,
        });
        return;
      }

      const [modelA, modelB] = models as [
        (typeof models)[0],
        (typeof models)[0],
      ];

      // Map API models to CompareModel
      const compareModelA = mapModelToCompareModel(modelA);
      const compareModelB = mapModelToCompareModel(modelB);

      // Generate responses from both models
      const [responseA, responseB] = await Promise.all([
        generateResponse(compareModelA, ctx.generatedPrompt!, ctx),
        generateResponse(compareModelB, ctx.generatedPrompt!, ctx),
      ]);

      // Replace current comparison with new one
      ctx.setComparisons((prev) => [
        ...prev.slice(0, -1), // Remove last comparison
        {
          modelA: compareModelA,
          modelB: compareModelB,
          responseA,
          responseB,
          scoreA: null,
          scoreB: null,
          ratingA: null,
          ratingB: null,
          isRevealed: false,
          matchId: null,
        },
      ]);

      toast.update(loadingToast, {
        render: "New responses generated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error generating new responses:", error);
      toast.update(loadingToast, {
        render: `Failed to generate new responses: ${errorMessage(error)}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      ctx.setIsGenerating(false);
    }
  };

  const handleSubmitRatings = async () => {
    if (
      !ctx.selectedPromptSet ||
      ctx.selectedPromptSet.id === undefined ||
      !ctx.generatedPrompt
    ) {
      toast.error("Please select a Benchmark first");
      return;
    }

    ctx.setIsSaving(true);
    const loadingToast = toast.loading("Saving ratings...");

    try {
      // 1. Check if prompt already exists by content hash
      const checkResult = await promptAPI.checkByHash({
        fullPromptCID: ctx.generatedPrompt.fullPromptCID,
        fullPromptSHA256: ctx.generatedPrompt.fullPromptSHA256,
        promptSetId: ctx.selectedPromptSet.id!,
      });

      // 2. Handle prompt creation and assignment
      if (!checkResult.exists) {
        // Prompt doesn't exist - create it (this also assigns it to the benchmark)
        await promptAPI.postPrompts({
          promptSetId: ctx.selectedPromptSet.id!,
          prompts: [ctx.generatedPrompt],
        });
      } else {
        if (!checkResult.isAssignedToBenchmark) {
          // Prompt exists but not assigned to this benchmark - just assign it
          await promptSetAPI.assignPrompt(ctx.selectedPromptSet.id!, {
            promptId: checkResult.promptId!,
          });
        }

        // If the prompt exists then we need to rebuild the response objects to include the correct prompt id
        comparison.responseA!.prompt.promptUUID = checkResult.promptId!;
        comparison.responseB!.prompt.promptUUID = checkResult.promptId!;
      }

      // 3. Save both responses
      await responseAPI.postResponses({
        responses: [comparison.responseA!, comparison.responseB!],
      });

      // 4. Calculate hashes for scores
      const promptHashSha256Registration = await calculateSHA256(
        stableStringify(ctx.generatedPrompt)!
      );
      const promptHashCIDRegistration = await calculateCID(
        stableStringify(ctx.generatedPrompt)!
      ).then((c) => c.toString());

      const responseAHashSha256Registration = await calculateSHA256(
        stableStringify(comparison.responseA)!
      );
      const responseAHashCIDRegistration = await calculateCID(
        stableStringify(comparison.responseA)!
      ).then((c) => c.toString());

      const responseBHashSha256Registration = await calculateSHA256(
        stableStringify(comparison.responseB)!
      );
      const responseBHashCIDRegistration = await calculateCID(
        stableStringify(comparison.responseB)!
      ).then((c) => c.toString());

      // Convert 0-10 ratings to 0-1 scores
      const scoreAValue = ratingA / 10;
      const scoreBValue = ratingB / 10;

      // Create score objects
      const scoreA = {
        scoreUUID: uuidv7(),
        responseUUID: comparison.responseA!.responseUUID,
        runId: comparison.responseA!.runId,
        response: comparison.responseA!.response,
        responseSHA256: comparison.responseA!.responseSHA256,
        responseCID: comparison.responseA!.responseCID,
        startedAt: comparison.responseA!.startedAt,
        finishedAt: comparison.responseA!.finishedAt,
        provider: comparison.responseA!.provider,
        modelSlug: comparison.responseA!.modelSlug,
        prompt: comparison.responseA!.prompt,
        method: ScoringMethods.human,
        score: scoreAValue,
        responseHashSha256Registration: responseAHashSha256Registration,
        responseHashCIDRegistration: responseAHashCIDRegistration,
        promptHashSha256Registration,
        promptHashCIDRegistration,
        scorerUserId: await ctx.userId,
      };

      const scoreB = {
        scoreUUID: uuidv7(),
        responseUUID: comparison.responseB!.responseUUID,
        runId: comparison.responseB!.runId,
        response: comparison.responseB!.response,
        responseSHA256: comparison.responseB!.responseSHA256,
        responseCID: comparison.responseB!.responseCID,
        startedAt: comparison.responseB!.startedAt,
        finishedAt: comparison.responseB!.finishedAt,
        provider: comparison.responseB!.provider,
        modelSlug: comparison.responseB!.modelSlug,
        prompt: comparison.responseB!.prompt,
        method: ScoringMethods.human,
        score: scoreBValue,
        responseHashSha256Registration: responseBHashSha256Registration,
        responseHashCIDRegistration: responseBHashCIDRegistration,
        promptHashSha256Registration,
        promptHashCIDRegistration,
        scorerUserId: await ctx.userId,
      };

      // 4. Save scores
      await scoreAPI.postScores({
        scores: [scoreA, scoreB],
      });

      // 5. Determine winner and save model match
      let winnerSlug: string | null = null;
      if (ratingA > ratingB) {
        winnerSlug = comparison.modelA.modelId;
      } else if (ratingB > ratingA) {
        winnerSlug = comparison.modelB.modelId;
      }
      // If equal, winnerSlug stays null (draw)

      const matchResult = await modelAPI.postModelMatch({
        modelASlug: comparison.modelA.modelId,
        modelBSlug: comparison.modelB.modelId,
        winnerSlug,
        promptId: ctx.generatedPrompt.promptUUID,
        modelAScore: scoreAValue,
        modelBScore: scoreBValue,
        modelAResponseId: comparison.responseA!.responseUUID,
        modelBResponseId: comparison.responseB!.responseUUID,
      });

      // Update comparison state to reveal models and store match ID
      ctx.setComparisons((prev) =>
        prev.map((c, idx) =>
          idx === prev.length - 1
            ? {
                ...c,
                isRevealed: true,
                ratingA,
                ratingB,
                scoreA,
                scoreB,
                matchId: matchResult.data.matchId,
              }
            : c
        )
      );

      ctx.setIsDataSaved(true);

      toast.update(loadingToast, {
        render: "Ratings saved successfully! Models revealed.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error saving ratings:", error);
      toast.update(loadingToast, {
        render: `Failed to save ratings: ${errorMessage(error)}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      ctx.setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!comparison?.matchId) {
      toast.error("No match ID available to share");
      return;
    }

    setIsSharing(true);
    const loadingToast = toast.loading("Generating share link...");

    try {
      const result = await modelAPI.shareModelMatch(comparison.matchId);

      // Copy to clipboard
      await navigator.clipboard.writeText(result.data.shareUrl);

      toast.update(loadingToast, {
        render: "Share link copied to clipboard!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error sharing match:", error);
      toast.update(loadingToast, {
        render: `Failed to generate share link: ${errorMessage(error)}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-6">
      <h2 className="text-xl font-semibold text-gray-700">
        3. Rate & Save Responses
      </h2>
      <label className="block font-medium text-gray-700">
        Assign a Score for each Model
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rating for Model A */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model A Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rate from 0 to 10</span>
                <span className="text-2xl font-bold text-blue-600">
                  {ratingA}
                </span>
              </div>
              <Slider
                value={[ratingA]}
                onValueChange={(val) => setRatingA(val[0] ?? 5)}
                min={0}
                max={10}
                step={1}
                disabled={comparison.isRevealed || ctx.isSaving}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rating for Model B */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model B Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rate from 0 to 10</span>
                <span className="text-2xl font-bold text-blue-600">
                  {ratingB}
                </span>
              </div>
              <Slider
                value={[ratingB]}
                onValueChange={(val) => setRatingB(val[0] ?? 5)}
                min={0}
                max={10}
                step={1}
                disabled={comparison.isRevealed || ctx.isSaving}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benchmark Selection - Hidden but mounted when ratings are revealed */}
      <div className={`space-y-2 ${comparison.isRevealed ? "hidden" : ""}`}>
        <label className="block font-medium text-gray-700">
          Select Benchmark to Save Results
        </label>
        <p className="text-sm text-gray-500 mb-2">
          You can add this prompt either to a Benchmark you created, to a
          private Benchmark you were invited to or to a public one. If you
          don&apos;t know which one is good, just leave the default selection
          which is a public catch-all benchmark from Peerbench.
          <strong>
            {" "}
            Contributing to Benchmarks is a great way to get you name of a
            publication or a research paper!
          </strong>
        </p>
        <PromptSetSelect
          accessReason={PromptSetAccessReasons.submitPrompt}
          value={ctx.selectedPromptSet}
          onChange={ctx.setSelectedPromptSet}
          disabled={ctx.isSaving || comparison.isRevealed}
          placeholder="Select a Benchmark..."
          id="compare-prompt-set-select"
          defaultPromptSetId={0}
        />
      </div>

      <div className="flex gap-4">
        {!comparison.isRevealed && canShowMore && (
          <Button
            onClick={handleShowMore}
            disabled={ctx.isGenerating || ctx.isSaving}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {ctx.isGenerating ? "Loading..." : "Show New Responses"}
          </Button>
        )}

        {!comparison.isRevealed && (
          <Button
            onClick={handleSubmitRatings}
            disabled={
              ctx.isSaving || ctx.isGenerating || !ctx.selectedPromptSet
            }
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {ctx.isSaving ? "Saving..." : "Save Scores"}
          </Button>
        )}

        {comparison.isRevealed && (
          <>
            <Button
              onClick={handleShowMore}
              disabled={ctx.isGenerating}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {ctx.isGenerating ? "Loading..." : "Get New Responses"}
            </Button>
            <Button
              onClick={() => {
                // Reset for new comparison
                ctx.setUserPrompt("");
                ctx.setComparisons([]);
                ctx.setGeneratedPrompt(null);
                ctx.setIsDataSaved(false);
                ctx.setSelectedPromptSet(null);
                setCanShowMore(true);
              }}
              variant="outline"
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start New Comparison
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSharing || !comparison.matchId}
              className="flex-1"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

async function generateResponse(
  model: any,
  prompt: any,
  ctx: ReturnType<typeof usePageContext>
) {
  const provider = ctx.providers[model.provider];

  if (!provider?.implementation) {
    throw new Error(`Provider ${model.provider} not initialized`);
  }

  const rawResponse = await provider.implementation.forward(prompt.fullPrompt, {
    model: model.modelId,
  });

  const response: PromptResponse = await buildResponse({
    forwardResponse: rawResponse,
    prompt,
    provider: model.provider,
    modelSlug: model.modelId,
  });

  return response;
}
