import { usePageContext } from "../context";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/markdown-text";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PromptTypes,
  MULTIPLE_CHOICE_SYSTEM_PROMPT_JSON_BASED,
  OPEN_ENDED_SYSTEM_PROMPT,
  SENTENCE_REORDER_SYSTEM_PROMPT,
  TEXT_REPLACEMENT_SYSTEM_PROMPT,
  TYPO_SYSTEM_PROMPT,
  MultipleChoiceScorer,
  SimilarityScorer,
  LLMJudgeScorer,
  PromptScore,
  buildResponse,
  RateLimiter,
} from "peerbench";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircleIcon, TestTube, Eye, PlusCircle } from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { JSONView } from "@/components/json-view";
import { errorMessage } from "@/utils/error-message";
import { toast } from "react-toastify";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ModelSelect, { ModelSelectValue } from "@/components/model-select";
import { isAnyProviderLoading } from "@/lib/helpers/is-any-provider-loading";
import { useMemo } from "react";
import Link from "next/link";
import { formatUsd } from "@/utils/format-usd";
import Decimal from "decimal.js";

const paidModelRateLimiter = new RateLimiter({
  timeWindow: 3_000,
  maxWeight: 20,
});
const freeModelRateLimiter = new RateLimiter({
  timeWindow: 5_000,
  maxWeight: 1,
});

export default function TestPrompt() {
  const ctx = usePageContext();

  const testBlockerMessage = useMemo(() => {
    if (ctx.isUploading) {
      return "Upload in progress. Please wait.";
    }

    if (ctx.isInProgress) {
      return "In progress. Please wait.";
    }

    if (ctx.selectedTestModels.length === 0) {
      return "Please select at least one test model";
    }

    if (!ctx.prompt.prompt) {
      return "Question cannot be empty";
    }

    if (
      ctx.selectedPromptType === PromptTypes.OpenEnded &&
      !ctx.selectedScorerModel
    ) {
      return "Please select a scorer model for open-ended Prompts";
    }

    if (
      ctx.selectedPromptType === PromptTypes.MultipleChoice &&
      Object.keys(ctx.prompt.options || {}).length === 0
    ) {
      return "Please add options for multiple choice Prompts";
    }

    if (
      ctx.selectedPromptType === PromptTypes.MultipleChoice &&
      !ctx.prompt.answerKey
    ) {
      return "Please select an answer key for multiple choice Prompts";
    }
  }, [
    ctx.prompt.prompt,
    ctx.selectedTestModels,
    ctx.isInProgress,
    ctx.selectedPromptType,
    ctx.selectedScorerModel,
    ctx.prompt.answerKey,
    ctx.isUploading,
    ctx.prompt.options,
  ]);
  const totalCost = useMemo(
    () =>
      ctx.selectedTestModels.reduce((acc, tm) => {
        const inputCost = tm.response?.inputCost
          ? new Decimal(tm.response.inputCost)
          : new Decimal(0);
        const outputCost = tm.response?.outputCost
          ? new Decimal(tm.response.outputCost)
          : new Decimal(0);

        const scoreInputCost = tm.score?.scorerAIInputCost
          ? new Decimal(tm.score.scorerAIInputCost)
          : new Decimal(0);
        const scoreOutputCost = tm.score?.scorerAIOutputCost
          ? new Decimal(tm.score.scorerAIOutputCost)
          : new Decimal(0);

        return acc
          .add(inputCost)
          .add(outputCost)
          .add(scoreInputCost)
          .add(scoreOutputCost);
      }, new Decimal(0)),
    [ctx.selectedTestModels]
  );

  const handleTestModelSelected = (models: ModelSelectValue<true>) => {
    ctx.setSelectedTestModels((prev) =>
      models.map((model) => {
        // If the model was already in the selected list, don't remove its properties
        const previousSelection = prev.find(
          (m) => m.modelId === model.modelId && m.provider === model.provider
        );
        if (previousSelection) {
          return previousSelection;
        }

        return model;
      })
    );
  };

  const handleScorerModelSelected = (
    selectedModel: ModelSelectValue<false>
  ) => {
    ctx.setSelectedScorerModel(selectedModel);
  };

  const handleTestPrompt = async () => {
    // No models selected
    if (ctx.selectedTestModels.length === 0) return;

    ctx.setIsTesting(true);
    ctx.setSelectedTestModels((prev) =>
      prev.map((testModel) => ({
        ...testModel,
        response: undefined,
        score: undefined,
        error: undefined,
      }))
    );

    try {
      // Build final Prompt object
      const prompt = await ctx.buildPromptObject();

      // Get system prompt (use user input or default based on prompt type)
      const systemPrompt =
        ctx.testingSystemPrompt.trim() ||
        getDefaultSystemPrompt(ctx.selectedPromptType);

      const runId = uuidv7();
      const responses = await Promise.all(
        ctx.selectedTestModels.map(async (testModel) => {
          const provider = ctx.providers[testModel.provider];
          try {
            if (!provider?.implementation) {
              throw new Error("Provider not initialized");
            }

            const forwardResponse = await provider.implementation!.forward(
              ctx.prompt.fullPrompt,
              {
                // TODO: This kind of tier naming only available in Openrouter. Consider further checks in case of implementing more Providers.
                // Apply special rate limiting for free models
                // Use the chosen rate limiter for this model
                rateLimiter: testModel.modelId.endsWith(":free")
                  ? freeModelRateLimiter
                  : paidModelRateLimiter,

                model: testModel.modelId,
                system: systemPrompt,

                responseFormat:
                  // Force JSON response format for multiple choice Prompts
                  // because it is easier to parse the answer letter from a JSON object.
                  ctx.selectedPromptType === PromptTypes.MultipleChoice
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
                          },
                        },
                      }
                    : undefined,
              }
            );

            const response = await buildResponse({
              prompt,
              runId,
              forwardResponse,
              provider: testModel.provider,
              modelSlug: testModel.modelId,
              responseMetadata: {
                systemPrompt,
              },
            });

            // Update the response in the context
            ctx.setSelectedTestModels((prev) =>
              prev.map((model) =>
                testModel.provider === model.provider &&
                testModel.modelId === model.modelId
                  ? { ...model, response }
                  : model
              )
            );

            return response;
          } catch (error) {
            console.error(error);

            ctx.setSelectedTestModels((prev) =>
              prev.map((model) =>
                testModel.provider === model.provider &&
                testModel.modelId === model.modelId
                  ? {
                      ...model,
                      response: undefined,
                      error: errorMessage(error),
                    }
                  : model
              )
            );
          }
        })
      );

      await Promise.all(
        responses.map(async (response) => {
          if (!response) return;
          try {
            let score: PromptScore | undefined;

            if (ctx.selectedPromptType === PromptTypes.MultipleChoice) {
              const scorer = new MultipleChoiceScorer();
              score = await scorer.scoreOne(response);
            } else if (
              ctx.selectedPromptType === PromptTypes.OpenEnded ||
              ctx.selectedPromptType === PromptTypes.OpenEndedWithDocs
            ) {
              if (!ctx.selectedScorerModel) {
                console.warn("No scorer model selected for open-ended scoring");
                return;
              }

              const scorer = new LLMJudgeScorer();
              score = await scorer.scoreOne(response, {
                // Select the rate limiter based on whether the scorer model is free or paid
                rateLimiter: ctx.selectedScorerModel.modelId.includes(":free")
                  ? freeModelRateLimiter
                  : paidModelRateLimiter,
                provider:
                  ctx.providers[ctx.selectedScorerModel.provider]!
                    .implementation,
                model: ctx.selectedScorerModel.modelId,

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
            } else {
              // For all other type of Prompts calculate similarity of the expected answer and the given response
              const scorer = new SimilarityScorer();
              score = await scorer.scoreOne(response, {
                ignoreCase: true,
              });
            }

            if (score) {
              // Update the state with the produced Score
              ctx.setSelectedTestModels((prev) =>
                prev.map((testModel) =>
                  testModel.provider === response.provider &&
                  testModel.modelId === response.modelSlug
                    ? { ...testModel, score }
                    : testModel
                )
              );
            }
          } catch (err) {
            console.error(err);
            ctx.setSelectedTestModels((prev) =>
              prev.map((testModel) =>
                testModel.provider === response.provider &&
                testModel.modelId === response.modelSlug
                  ? { ...testModel, error: errorMessage(err) }
                  : testModel
              )
            );
          }
        })
      );

      // Update the Prompt state to include the built Prompt object
      ctx.setPrompt(prompt);
    } catch (error) {
      console.error(error);
      toast.error(`Error during testing: ${errorMessage(error)}`);
    } finally {
      ctx.setIsTesting(false);
    }
  };

  const handleOnCreateAnotherPromptClick = () => {
    // Clear all form state but keep the selected prompt set
    ctx.clearForNewPrompt();

    // Scroll back up to the Creation section
    setTimeout(() => {
      const creationSection = document.getElementById(
        "prompt-creation-section"
      );
      if (creationSection) {
        creationSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <TooltipProvider>
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-700">
          {ctx.generationMode === "llm-generated"
            ? "6. Prompt Evaluation"
            : "5. Prompt Evaluation"}
        </h2>
        <div className="space-y-4">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="block font-medium text-gray-700">
                Test Models
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Test your new Prompt against different models and see their
                compare their Responses.
              </span>
            </div>
            <div className="space-y-5">
              <ModelSelect
                isMulti={true}
                options={ctx.modelSelectOptions}
                value={ctx.selectedTestModels}
                isLoading={isAnyProviderLoading(ctx.providers)}
                onModelSelected={handleTestModelSelected}
                disabled={ctx.isInProgress}
              />
            </div>
          </div>

          <Accordion type="multiple">
            {ctx.selectedPromptType === PromptTypes.OpenEnded && (
              <AccordionItem value="scorer-model" className="border-none">
                <AccordionTrigger className="hover:underline mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700">
                          Scorer Model (Required)
                        </span>
                        <span className="text-sm text-gray-500">
                          {ctx.selectedScorerModel
                            ? `Using ${ctx.selectedScorerModel.modelId} from ${ctx.selectedScorerModel.provider}`
                            : "No model selected"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        You&apos;ve chosen Open-ended typed Prompt.
                        <br />
                        This type of Prompts need to be scored using a model.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 px-1 mt-1">
                    <div className="space-y-5">
                      <ModelSelect
                        isMulti={false}
                        isLoading={isAnyProviderLoading(ctx.providers)}
                        options={ctx.modelSelectOptions}
                        value={ctx.selectedScorerModel}
                        onModelSelected={handleScorerModelSelected}
                        disabled={ctx.isInProgress}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="system-prompt" className="border-none">
              <AccordionTrigger className="hover:underline mb-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-700">
                    System Prompt (Optional)
                  </span>
                  <span className="text-sm text-gray-500">
                    {ctx.testingSystemPrompt.trim()
                      ? "Using custom"
                      : "Using default based on the Prompt type"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 px-1 mt-1">
                  <Textarea
                    value={ctx.testingSystemPrompt}
                    onChange={(e) => ctx.setTestingSystemPrompt(e.target.value)}
                    disabled={ctx.isInProgress}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={3}
                    placeholder={getDefaultSystemPrompt(ctx.selectedPromptType)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Tooltip open={!Boolean(testBlockerMessage) ? false : undefined}>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  onClick={handleTestPrompt}
                  disabled={Boolean(testBlockerMessage)}
                  className="w-full"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {ctx.isTesting ? "Testing..." : "Test Prompt"}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{testBlockerMessage}</p>
            </TooltipContent>
          </Tooltip>

          {/* Model Responses */}
          {ctx.selectedTestModels.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">
                Model Responses
              </h3>
              <Accordion type="multiple" className="flex flex-col gap-3">
                {ctx.selectedTestModels.map((testModel, index) => (
                  <AccordionItem
                    key={`${testModel.provider}-${testModel.modelId}`}
                    value={index.toString()}
                    className="px-3"
                  >
                    <AccordionTrigger className="hover:underline">
                      <div className="flex items-center space-x-3">
                        {testModel.icon && (
                          <div className="w-5 h-5 relative">
                            <Image
                              src={testModel.icon}
                              alt={`${testModel.providerLabel} logo`}
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                        <span className="font-medium">{testModel.modelId}</span>
                        {ctx.isTesting &&
                        testModel.score === undefined &&
                        !testModel.error ? (
                          <LoaderCircleIcon className="w-4 h-4 animate-spin" />
                        ) : testModel.error ? (
                          <span className="text-sm text-red-500">
                            Error: {testModel.error.slice(0, 20)}...
                          </span>
                        ) : testModel.response &&
                          testModel.score !== undefined ? (
                          <span className="text-sm text-gray-500">
                            (
                            {testModel.response?.response.slice(0, 15) ||
                              "No response"}
                            ...) - Score {testModel.score.score}
                          </span>
                        ) : null}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {testModel.error ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-red-700">
                            Error
                          </h4>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="text-sm text-red-700">
                              {testModel.error}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <h4 className="text-sm font-medium text-gray-700">
                              Response
                            </h4>
                            {testModel.response?.inputCost &&
                              testModel.response?.outputCost && (
                                <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                                  <div>Cost:</div>
                                  <div>
                                    {formatUsd(
                                      new Decimal(
                                        testModel.response.inputCost
                                      ).add(
                                        new Decimal(
                                          testModel.response.outputCost
                                        )
                                      )
                                    )}
                                  </div>
                                  {testModel.score?.scorerAIInputCost &&
                                    testModel.score?.scorerAIOutputCost && (
                                      <>
                                        <div>AI Scorer Cost:</div>
                                        <div>
                                          {formatUsd(
                                            new Decimal(
                                              testModel.score.scorerAIInputCost
                                            ).add(
                                              new Decimal(
                                                testModel.score.scorerAIOutputCost
                                              )
                                            )
                                          )}
                                        </div>
                                      </>
                                    )}
                                </div>
                              )}
                          </div>
                          <div className="bg-gray-100 rounded-lg p-4">
                            {testModel.response ? (
                              <MarkdownText className="text-sm">
                                {testModel.response.response}
                              </MarkdownText>
                            ) : (
                              <div className="text-sm text-gray-500 italic">
                                {ctx.isTesting
                                  ? "Testing in progress..."
                                  : "No Response yet."}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {testModel.score !== undefined &&
                        Object.keys(testModel.score.scoreMetadata || {})
                          .length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              Scoring Metadata
                            </h4>
                            <div className="bg-white rounded border p-3">
                              <JSONView
                                collapsed
                                data={testModel.score.scoreMetadata}
                              />
                            </div>
                          </div>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {totalCost.gt(0) && !ctx.isInProgress && (
            <div className="p-3 w-full bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-green-700">Total Cost</span>
                <span className="text-sm text-green-500">
                  {formatUsd(totalCost)}
                </span>
              </div>
            </div>
          )}

          {/* Post-upload buttons */}
          {ctx.lastUploadedPromptId && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="default" className="flex-1" asChild>
                  <Link href={`/prompts/${ctx.lastUploadedPromptId}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Uploaded Prompt
                  </Link>
                </Button>
                <Button
                  id="create-another-prompt-button"
                  onClick={handleOnCreateAnotherPromptClick}
                  variant="outline"
                  className="flex-1"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Another Prompt
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Default system prompts based on prompt type using SDK constants
const getDefaultSystemPrompt = (promptType: string) => {
  switch (promptType) {
    case PromptTypes.MultipleChoice:
      return MULTIPLE_CHOICE_SYSTEM_PROMPT_JSON_BASED;
    case PromptTypes.OpenEnded:
      return OPEN_ENDED_SYSTEM_PROMPT;
    case PromptTypes.OpenEndedWithDocs:
      return OPEN_ENDED_SYSTEM_PROMPT; // Use the same system prompt as OpenEnded
    case PromptTypes.OrderSentences:
      return SENTENCE_REORDER_SYSTEM_PROMPT;
    case PromptTypes.TextReplacement:
      return TEXT_REPLACEMENT_SYSTEM_PROMPT;
    case PromptTypes.Typo:
      return TYPO_SYSTEM_PROMPT;
    default:
      return "You are an expert assistant. Please provide a helpful and accurate response to the following question.";
  }
};
