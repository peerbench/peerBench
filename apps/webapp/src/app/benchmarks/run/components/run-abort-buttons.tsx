import {
  BenchmarkScoringMethods,
  ResultInfo,
  usePageContext,
} from "../context";
import {
  buildResponse,
  LLMJudgeScorer,
  MULTIPLE_CHOICE_SYSTEM_PROMPT_JSON_BASED,
  MultipleChoiceScorer,
  OPEN_ENDED_SYSTEM_PROMPT,
  Prompt,
  PromptResponse,
  PromptType,
  PromptTypes,
  RateLimiter,
  SENTENCE_REORDER_SYSTEM_PROMPT,
  SimilarityScorer,
  TEXT_REPLACEMENT_SYSTEM_PROMPT,
  TYPO_SYSTEM_PROMPT,
} from "peerbench";
import { v7 as uuidv7 } from "uuid";
import { errorMessage } from "@/utils/error-message";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Play, StopCircle, RotateCcw } from "lucide-react";
import Decimal from "decimal.js";

const paidModelRateLimiter = new RateLimiter({
  timeWindow: 3_000,
  maxWeight: 20,
});
const freeModelRateLimiter = new RateLimiter({
  timeWindow: 5_000,
  maxWeight: 1,
});

export default function RunAbortButtons() {
  const ctx = usePageContext();

  const scoreByAI = async (prompt: Prompt, response: PromptResponse) => {
    if (!ctx.selectedAiScorerModel) {
      throw new Error("No scorer model selected");
    }

    const scorer = new LLMJudgeScorer();

    return await scorer.scoreOne(response, {
      // Select the rate limiter based on whether the scorer model is free or paid
      rateLimiter: ctx.selectedAiScorerModel.modelId.includes(":free")
        ? freeModelRateLimiter
        : paidModelRateLimiter,
      provider:
        ctx.providers[ctx.selectedAiScorerModel.provider]!.implementation,
      model: ctx.selectedAiScorerModel.modelId,

      // TODO: We can expand this
      criteria: [
        {
          id: "reasoning_score",
          description:
            "How reasonable the response is according to the input and the expected answer (if provided)",
          weight: 1,
          scale: {
            min: 0,
            max: 100,
          },
        },
      ],
    });
  };

  const scoreResponse = async (prompt: Prompt, response: PromptResponse) => {
    if (
      ctx.scoringMethod === BenchmarkScoringMethods.none ||
      ctx.scoringMethod === BenchmarkScoringMethods.human
    ) {
      // No scoring needed
      return;
    }

    if (ctx.scoringMethod === BenchmarkScoringMethods.ai) {
      return await scoreByAI(prompt, response);
    }

    // Now Scoring method is `algo`, aka auto

    if (prompt.type === PromptTypes.MultipleChoice) {
      const scorer = new MultipleChoiceScorer();
      return await scorer.scoreOne(response);
    } else if (
      prompt.type === PromptTypes.OpenEnded ||
      prompt.type === PromptTypes.OpenEndedWithDocs
    ) {
      return await scoreByAI(prompt, response);
    }

    if (prompt.answer) {
      const scorer = new SimilarityScorer();
      return await scorer.scoreOne(response, {
        ignoreCase: true,
      });
    }

    // No valid way found to score, user will need to manually score
  };

  const handleAbort = () => {
    if (ctx.benchmarkAbortController.current) {
      ctx.benchmarkAbortController.current.abort();
      ctx.logsHandler.current?.error("Benchmark aborted by user");
      ctx.setIsRunning(false);
    }
  };

  const handleBenchmark = async () => {
    ctx.setIsRunning(true);
    ctx.setIsResultsUploaded(false);
    ctx.setAreAllResponsesScored(true);

    // Initialize the results with zero values for each selected model
    ctx.setResultInfos(
      ctx.selectedModels.map<ResultInfo>((model) => ({
        model,
        totalCost: new Decimal(0),
        provider: model.provider,
        correctAnswers: 0,
        wrongAnswers: 0,
        unknownAnswers: 0,
        totalLatency: 0,
        responsesReceived: 0,
        totalScore: 0,
      }))
    );

    ctx.clearResults();
    ctx.runId.current = uuidv7();
    ctx.startedAt.current = Date.now();
    ctx.finishedAt.current = 0;
    ctx.logsHandler.current?.clearLogs();
    ctx.logsHandler.current?.info("Started");

    // Create new AbortController for this benchmark run
    ctx.benchmarkAbortController.current = new AbortController();

    try {
      // Execution all the Prompts in parallel
      await Promise.all(
        ctx.promptsToBeTested.map(async (prompt) => {
          const systemPrompt = getSystemPrompt(prompt.type);
          const promptBeginning = prompt.fullPrompt.slice(0, 50);

          await Promise.all(
            ctx.selectedModels.map(async (selectedModel) => {
              const provider = ctx.providers[selectedModel.provider]!;
              const modelId = selectedModel.modelId;

              ctx.logsHandler.current?.info(
                `Prompt "${promptBeginning}..." sending to "${provider.identifier}/${modelId}"`
              );

              if (
                prompt.testedByModels.includes(modelId) &&
                !ctx.includeScoredPrompts
              ) {
                ctx.logsHandler.current?.warning(
                  `Prompt "${promptBeginning}..." already tested by model ${provider.identifier}/${modelId}, skipping...`
                );
                return;
              }

              try {
                const forwardResponse = await provider.implementation!.forward(
                  prompt.fullPrompt,
                  {
                    // TODO: This kind of tier naming only available in Openrouter. Consider further checks in case of implementing more Providers.
                    // Apply special rate limiting for free models
                    // Use the chosen rate limiter for this model
                    rateLimiter: modelId.endsWith(":free")
                      ? freeModelRateLimiter
                      : paidModelRateLimiter,

                    model: modelId,
                    system: systemPrompt,
                    abortSignal: ctx.benchmarkAbortController.current!.signal,
                    responseFormat:
                      // Force JSON response format for multiple choice Prompts
                      // because it is easier to parse the answer letter from a JSON object.
                      prompt.type === PromptTypes.MultipleChoice
                        ? {
                            type: "json_schema",
                            json_schema: {
                              name: "multiple_choice_answer",
                              schema: {
                                type: "object",
                                properties: {
                                  answer: {
                                    description:
                                      "The letter of the answer that is correct",
                                    type: "string",
                                  },
                                },
                                required: ["answer"],
                              },
                            },
                          }
                        : undefined,
                  }
                );

                const response = await buildResponse({
                  modelSlug: selectedModel.modelId,
                  provider: provider.identifier,
                  prompt,
                  forwardResponse,
                  runId: ctx.runId.current,
                  responseMetadata: {
                    systemPrompt,
                  },
                });
                const score = await scoreResponse(prompt, response);

                if (!score) {
                  ctx.setAreAllResponsesScored(false);
                }

                ctx.addResult({
                  response,
                  score,
                });
                ctx.logsHandler.current?.success(
                  `Response for Prompt "${promptBeginning}..." received from model ${provider.identifier}/${modelId}`
                );
              } catch (error) {
                if (ctx.benchmarkAbortController.current?.signal.aborted) {
                  return;
                }

                console.error(error);
                ctx.logsHandler.current?.error(
                  `Error while forwarding Prompt (${promptBeginning}...) to model ${provider.identifier}/${modelId}: ${errorMessage(error)}`
                );
              }
            })
          );
        })
      );
      toast.info("Benchmark over");
    } catch (error) {
      console.error(error);
      toast.error(`Error while running the test: ${errorMessage(error)}`);
    } finally {
      ctx.setIsRunning(false);
      ctx.benchmarkAbortController.current = null;
      ctx.logsHandler.current?.info("Stopped");
      ctx.finishedAt.current = Date.now();
    }
  };

  const reset = (
    params: { models?: boolean; results?: boolean } = {
      models: false,
      results: false,
    }
  ) => {
    ctx.setIsLoadingPrompts(false);
    ctx.setIsUploading(false);
    ctx.setIsResultsUploaded(false);

    if (params.models) {
      ctx.setSelectedModels([]);
    }

    if (params.results) {
      ctx.setResultInfos([]);
      ctx.clearResults();
    }

    ctx.existingPromptSetSelectHandler?.current?.clear();
    ctx.savePromptSetSelectHandler?.current?.clear();

    ctx.setPromptsToBeTested([]);
    ctx.setUploadedFileName(null);
    ctx.setSelectedAiScorerModel(null);
  };

  return (
    <div className="flex gap-4 justify-center">
      {ctx.isRunning ? (
        <Button variant="destructive" onClick={handleAbort}>
          <StopCircle className="mr-2 h-4 w-4" />
          Abort
        </Button>
      ) : ctx.resultInfos.length > 0 ? (
        <div className="flex gap-3">
          <Button
            onClick={handleBenchmark}
            disabled={
              ctx.isRunning ||
              ctx.isUploading ||
              ctx.promptsToBeTested.length === 0 ||
              !ctx.isUploadedFileFollowsStandardFormat ||
              (ctx.areThereOpenEndedPrompts &&
                ctx.scoringMethod !== BenchmarkScoringMethods.human &&
                ctx.scoringMethod !== BenchmarkScoringMethods.none &&
                !ctx.selectedAiScorerModel)
            }
          >
            <Play className="mr-2 h-4 w-4" />
            Run Benchmark Again
          </Button>
          <Button
            variant="outline"
            onClick={() => reset({ results: true })}
            disabled={ctx.isRunning || ctx.isUploading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleBenchmark}
          disabled={
            ctx.isRunning ||
            ctx.isUploading ||
            !ctx.selectedPromptSet ||
            ctx.promptsToBeTested.length === 0 ||
            !ctx.isUploadedFileFollowsStandardFormat ||
            ctx.selectedModels.length === 0 ||
            (ctx.areThereOpenEndedPrompts &&
              ctx.scoringMethod !== BenchmarkScoringMethods.human &&
              ctx.scoringMethod !== BenchmarkScoringMethods.none &&
              !ctx.selectedAiScorerModel)
          }
        >
          <Play className="mr-2 h-4 w-4" />
          Run Benchmark
        </Button>
      )}
    </div>
  );
}

function getSystemPrompt(promptType: PromptType) {
  switch (promptType) {
    case "multiple-choice":
      return MULTIPLE_CHOICE_SYSTEM_PROMPT_JSON_BASED;
    case "open-ended":
      return OPEN_ENDED_SYSTEM_PROMPT;
    case "text-replacement":
      return TEXT_REPLACEMENT_SYSTEM_PROMPT;
    case "typo":
      return TYPO_SYSTEM_PROMPT;
    case "order-sentences":
      return SENTENCE_REORDER_SYSTEM_PROMPT;
    default:
      return OPEN_ENDED_SYSTEM_PROMPT;
  }
}
