"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageContext } from "../context";
import { useMemo, useState } from "react";
import {
  calculateCID,
  calculateSHA256,
  hashObject,
  NonRevealedPromptResponseSchema,
  NonRevealedPromptSchema,
  PromptResponseSchema,
  PromptTypes,
  stableStringify,
} from "peerbench";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  LucideEye,
  LucideLoader2,
  LucideLock,
  LucideThumbsUp,
  LucideUpload,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { uploadAction } from "@/lib/actions/upload";
import { QK_PROMPT_SETS, QK_PROMPTS } from "@/lib/react-query/query-keys";
import { errorMessage } from "@/utils/error-message";
import { MessageModal } from "@/components/modals/message-modal";
import { useAuth } from "@/components/providers/auth";
import Link from "next/link";
import { DownloadButton } from "@/components/download-button";

const UPLOAD_COUNT_KEY = "peerbench_prompt_upload_count";

type UploadOption = "all" | "hidden";

export function UploadDownloadButtons() {
  const ctx = usePageContext();
  const queryClient = useQueryClient();
  const user = useAuth();
  const [showReviewReminder, setShowReviewReminder] = useState(false);
  const [uploadOption, setUploadOption] = useState<UploadOption>("all");

  const uploadBlockerMessage = useMemo(() => {
    if (ctx.lastUploadedPromptId !== null) {
      return "Upload is already done";
    }

    if (ctx.isUploading) {
      return "Upload in progress. Please wait.";
    }

    if (ctx.isInProgress) {
      return "In progress. Please wait.";
    }

    if (!ctx.prompt.prompt) {
      return "Question cannot be empty";
    }

    if (ctx.selectedPromptType === PromptTypes.MultipleChoice) {
      if (Object.keys(ctx.prompt.options || {}).length === 0) {
        return "No options provided for multiple choice question";
      }

      if (
        Object.values(ctx.prompt.options || {}).some(
          (value) => value?.trim() === ""
        )
      ) {
        return "Some options are empty";
      }

      if (!ctx.prompt.answerKey) {
        return "Correct answer must be marked";
      }

      if (!ctx.prompt.answer) {
        return "Correct answer shouldn't be empty";
      }

      return;
    }
  }, [
    ctx.selectedPromptType,
    ctx.prompt.options,
    ctx.prompt.answerKey,
    ctx.prompt.answer,
    ctx.prompt.prompt,
    ctx.isInProgress,
    ctx.isUploading,
    ctx.lastUploadedPromptId,
  ]);

  const downloadBlockerMessage = useMemo(() => {
    if (ctx.isInProgress) {
      return "In progress. Please wait.";
    }

    if (!ctx.prompt.prompt) {
      return "Question cannot be empty";
    }

    if (ctx.selectedPromptType === PromptTypes.MultipleChoice) {
      if (Object.keys(ctx.prompt.options || {}).length === 0) {
        return "No options provided for multiple choice question";
      }

      if (
        Object.values(ctx.prompt.options || {}).some(
          (value) => value?.trim() === ""
        )
      ) {
        return "Some options are empty";
      }

      if (!ctx.prompt.answerKey) {
        return "Correct answer must be marked";
      }

      if (!ctx.prompt.answer) {
        return "Correct answer shouldn't be empty";
      }

      return;
    }
  }, [
    ctx.selectedPromptType,
    ctx.prompt.options,
    ctx.prompt.answerKey,
    ctx.prompt.answer,
    ctx.prompt.prompt,
    ctx.isInProgress,
  ]);

  const handleUploadButtonClick = async () => {
    if (Boolean(uploadBlockerMessage)) return;

    // Check if a prompt set is selected
    if (!ctx.selectedPromptSet) {
      toast.error("Please select a Benchmark before uploading");
      return;
    }

    ctx.setIsUploading(true);
    const loadingToast = toast.loading("Uploading Prompt...");

    try {
      // If the final Prompt object is not built yet, build it.
      const prompt =
        uploadOption === "all"
          ? await ctx.buildPromptObject() // Use the full Prompt object
          : NonRevealedPromptSchema.parse(await ctx.buildPromptObject()); // Use the schema to filter out the data fields

      const responses = await Promise.all(
        ctx.selectedTestModels
          .filter((tm) => tm.response !== undefined)
          .map(async (tm) => {
            if (uploadOption === "all") {
              return {
                ...tm.response!,
                prompt,
                // TODO: Add signature fields
              };
            }

            // Don't reveal the Response data
            const nonRevealedResponse = NonRevealedPromptResponseSchema.parse({
              ...tm.response!,
              prompt,
            });

            const { cid, sha256 } = await hashObject(
              PromptResponseSchema.parse({
                ...tm.response!,
                prompt,
              })
            );

            return {
              ...nonRevealedResponse,

              // Include original object's hash calculations
              hashSha256Registration: sha256,
              hashCIDRegistration: cid,
              // TODO: Add signature fields
            };
          })
      );

      const promptHashSha256Registration = await calculateSHA256(
        stableStringify(prompt)!
      );
      const promptHashCIDRegistration = await calculateCID(
        stableStringify(prompt)!
      ).then((c) => c.toString());

      const scores = await Promise.all(
        ctx.selectedTestModels
          .filter((tm) => tm.score !== undefined && tm.response !== undefined)
          .map(async (tm) => {
            const response = tm.response!;

            const responseHashSha256Registration = await calculateSHA256(
              stableStringify(response)!
            );
            const responseHashCIDRegistration = await calculateCID(
              stableStringify(response)!
            ).then((c) => c.toString());

            return {
              ...tm.score!,

              responseHashSha256Registration,
              responseHashCIDRegistration,
              promptHashSha256Registration,
              promptHashCIDRegistration,

              // TODO: Add signature fields
            };
          })
      );

      const result = await uploadAction({
        promptSetId: ctx.selectedPromptSet.id!,
        prompts:
          ctx.lastUploadedPromptId === null
            ? ([
                {
                  ...prompt,
                  hashCIDRegistration:
                    uploadOption === "hidden"
                      ? promptHashCIDRegistration
                      : undefined,
                  hashSha256Registration:
                    uploadOption === "hidden"
                      ? promptHashSha256Registration
                      : undefined,
                  // TODO: Add signature fields
                },
                // TODO: Fix type inferring of POST request body
              ] as any)
            : undefined,

        // TODO: Fix type inferring of POST request body
        responses: responses.length > 0 ? (responses as any) : undefined,
        scores: scores.length > 0 ? scores : undefined,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (ctx.lastUploadedPromptId === null) {
        // Store the uploaded Prompt ID for the buttons
        ctx.setLastUploadedPromptId(prompt.promptUUID);
      }

      // Invalidate query caches
      queryClient.invalidateQueries({
        predicate: (query) =>
          // Prompt Set lists query
          query.queryKey[0] === QK_PROMPT_SETS ||
          // Prompts query
          query.queryKey[0] === QK_PROMPTS,
      });

      // Update the context state since revalidating the cache doesn't update the local state
      ctx.setSelectedPromptSet((prev) =>
        prev
          ? { ...prev, totalPromptsCount: prev.totalPromptsCount! + 1 }
          : null
      );

      toast.update(loadingToast, {
        render: "Data uploaded successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // Track upload count and show reminder every 3rd upload
      const currentCount = parseInt(
        localStorage.getItem(UPLOAD_COUNT_KEY) || "0",
        10
      );
      const newCount = currentCount + 1;
      localStorage.setItem(UPLOAD_COUNT_KEY, newCount.toString());

      // Show reminder every 3rd upload
      if (newCount % 3 === 0) {
        setShowReviewReminder(true);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      toast.update(loadingToast, {
        render: `Upload failed: ${errorMessage(error)}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      ctx.setIsUploading(false);
    }
  };

  const prepareDownloadFile = async () => {
    const prompt = await ctx.buildPromptObject();

    return {
      // Build the peerBench file format
      data: JSON.stringify(
        [
          prompt,
          // Responses
          ...ctx.selectedTestModels
            .filter((tm) => tm.response !== undefined)
            .map((tm) => ({
              ...tm.response!,
              prompt,
            })),
          // Scores
          ...ctx.selectedTestModels
            .filter((tm) => tm.score !== undefined)
            .map((tm) => tm.score!),
        ],
        null,
        2
      ),
      filename: `peerbench-${prompt.promptUUID}-${new Date().toISOString().replace(/[:.]/g, "-")}.peerbench.json`,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save</CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-1/2 space-y-3">
            <RadioGroup
              value={uploadOption}
              onValueChange={(value) => setUploadOption(value as UploadOption)}
              disabled={ctx.isUploading || Boolean(uploadBlockerMessage)}
            >
              <div className="flex flex-1/2 items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="all" id="upload-all" />
                <Label htmlFor="upload-all" className="flex-1 cursor-pointer">
                  <div className="flex space-x-2">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <LucideEye className="text-blue-500 w-4 h-4" />
                        <div className="font-medium text-lg text-gray-600">
                          Revealed
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        The Prompt, Responses and Scores (if there are) will be
                        uploaded with their data. The users who has access to
                        the chosen Benchmark will be able to see them.
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex flex-1/2 items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="hidden" id="upload-hidden" />
                <Label
                  htmlFor="upload-hidden"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex space-x-2">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <LucideLock className="text-red-500 w-4 h-4" />
                        <div className="font-medium text-lg text-gray-600">
                          Hidden
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        The Prompt, Responses and Scores (if there are) will be
                        uploaded without their data. They will be associated
                        with the chosen Benchmark. The Scores will be visible by
                        the users who has access to the Benchmark but contents
                        of the Responses and the full Prompt data will not be
                        visible.
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <Tooltip open={!Boolean(uploadBlockerMessage) ? false : undefined}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    onClick={handleUploadButtonClick}
                    disabled={Boolean(uploadBlockerMessage)}
                    variant="default"
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    {ctx.isUploading ? (
                      <>
                        <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : ctx.lastUploadedPromptId !== null ? (
                      "Saved"
                    ) : (
                      <>
                        <LucideUpload className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{uploadBlockerMessage}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="border-l border-l-gray-500 flex-1" />
            <div className="text-sm text-gray-500 italic">OR</div>
            <div className="border-l border-l-gray-500 flex-1" />
          </div>

          <div className="flex flex-col flex-1/2">
            <p className="flex-1 items-center flex justify-center text-sm text-gray-600 mb-3">
              Download the raw data of the Prompt, Responses and Scores (if
              there are). You can use this file to store your data manually or
              later to reveal your Prompt/Responses if you have uploaded them as
              hidden.
            </p>
            <Tooltip
              open={!Boolean(downloadBlockerMessage) ? false : undefined}
            >
              <TooltipTrigger asChild>
                <div className="w-full">
                  <DownloadButton
                    className="w-full"
                    content={prepareDownloadFile}
                    mimeType="application/json"
                    disabled={Boolean(downloadBlockerMessage)}
                    variant="outline"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{downloadBlockerMessage}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>

      {/* Review Reminder Modal */}
      {showReviewReminder && Boolean(user) && (
        <MessageModal
          message={
            <div className="space-y-3">
              <div>
                Great work! You&apos;ve uploaded{" "}
                {localStorage.getItem(UPLOAD_COUNT_KEY)} prompts.
              </div>
              <div>
                To get your prompts verified and included in benchmarks, ask
                friends to review them! Share your personal review link:
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Link
                  href={`/prompts/review?uploaderId=${user?.id}`}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                  onClick={() => setShowReviewReminder(false)}
                >
                  {typeof window !== "undefined" && window.location.origin}
                  /prompts/review?uploaderId={user?.id}
                </Link>
              </div>
              <div className="text-sm text-gray-600">
                The more reviews your prompts get, the more likely they&apos;ll
                be verified and used in benchmarks!
              </div>
            </div>
          }
          title="Get Your Prompts Reviewed!"
          icon={<LucideThumbsUp className="w-5 h-5 text-blue-500" />}
          onClose={() => setShowReviewReminder(false)}
        />
      )}
    </Card>
  );
}
