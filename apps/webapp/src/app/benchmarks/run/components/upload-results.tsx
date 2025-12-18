import { useState, useMemo } from "react";
import { usePageContext, BenchmarkScoringMethods } from "../context";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  hashObject,
  NonRevealedPromptSchema,
  NonRevealedPromptResponseSchema,
  RateLimiter,
} from "peerbench";
import { errorMessage } from "@/utils/error-message";
import {
  LucideLoader2,
  LucideUpload,
  LucideEye,
  LucideLock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QK_PROMPT_SETS, QK_PROMPTS } from "@/lib/react-query/query-keys";
import {
  type PromptToBeUploaded,
  type ResponseToBeUploaded,
  type ScoreToBeUploaded,
  uploadAction,
} from "@/lib/actions/upload";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DownloadButton } from "@/components/download-button";
import { useSettingExtra } from "../../../../lib/hooks/settings/use-setting-extra";

type UploadOption = "all" | "hidden";

export default function UploadResults() {
  const ctx = usePageContext();
  const queryClient = useQueryClient();
  const [uploadOption, setUploadOption] = useState<UploadOption>("all");
  const [isUploading, setIsUploading] = useState(false);

  const [extraEnabled] = useSettingExtra();

  const handleUpload = async () => {
    setIsUploading(true);
    const loadingToast = toast.loading("Saving...");

    try {
      // Upload Prompts only if the user uploaded a file
      const prompts = await Promise.all(
        ctx.promptsToBeTested.map<Promise<PromptToBeUploaded>>(
          async (prompt) => {
            if (uploadOption === "all") {
              return {
                ...prompt,
                // TODO: Add signature fields
              };
            }

            const { cid, sha256 } = await hashObject(prompt);
            const nonRevealedPrompt = NonRevealedPromptSchema.parse(prompt);

            return {
              ...nonRevealedPrompt,

              // Include original object's hash calculations
              hashCIDRegistration: cid,
              hashSha256Registration: sha256,

              // TODO: Add signature fields
            };
          }
        )
      );

      const responses = await Promise.all(
        ctx.results
          .filter((r) => r.response !== undefined)
          .map<Promise<ResponseToBeUploaded>>(async (result) => {
            if (uploadOption === "all") {
              return {
                ...result.response,
                // TODO: Add signature fields
              };
            }

            // Don't reveal the Response data
            const nonRevealedResponse = NonRevealedPromptResponseSchema.parse(
              result.response
            );
            const { cid, sha256 } = await hashObject(result.response);

            return {
              ...nonRevealedResponse,

              // Include original object's hash calculations
              hashSha256Registration: sha256,
              hashCIDRegistration: cid,

              // TODO: Add signature fields
            };
          })
      );

      const scores = await Promise.all(
        ctx.results
          .filter((r) => r.score !== undefined) // Ignore the ones that are not scored yet
          .map<Promise<ScoreToBeUploaded>>(async (r) => {
            const {
              sha256: promptHashSha256Registration,
              cid: promptHashCIDRegistration,
            } = await hashObject(r.response.prompt);
            const {
              sha256: responseHashSha256Registration,
              cid: responseHashCIDRegistration,
            } = await hashObject(r.response);

            return {
              ...r.score!,

              responseHashSha256Registration,
              responseHashCIDRegistration,
              promptHashSha256Registration,
              promptHashCIDRegistration,

              // TODO: Add signature fields
            };
          })
      );

      if (
        prompts.length === 0 &&
        responses.length === 0 &&
        scores.length === 0
      ) {
        throw new Error("Nothing to upload");
      }

      const rateLimiter = new RateLimiter();
      const chunkSize = 210; // Chunk size per entity (3 / 210 = 70 prompts, responses and scores per API call)
      while (true) {
        const promptChunk = ctx.uploadedFileName
          ? prompts.slice(0, chunkSize / 3)
          : [];
        const scoreChunk =
          ctx.scoringMethod !== BenchmarkScoringMethods.none
            ? scores.slice(0, chunkSize / 3)
            : [];
        const responseChunk = responses.slice(0, chunkSize / 3);

        // No more data to upload
        if (
          promptChunk.length === 0 &&
          responseChunk.length === 0 &&
          scoreChunk.length === 0
        ) {
          break;
        }

        const result = await rateLimiter.execute(() =>
          uploadAction({
            promptSetId: ctx.selectedPromptSet?.id,
            prompts: promptChunk.length > 0 ? promptChunk : undefined,
            responses: responseChunk.length > 0 ? responseChunk : undefined,
            scores: scoreChunk.length > 0 ? scoreChunk : undefined,
          })
        );

        if (result?.error) {
          throw new Error(result.error);
        }

        // Remove the uploaded chunk from the arrays so in the next iteration
        // we will pick up the next chunk.
        prompts.splice(0, chunkSize / 3);
        responses.splice(0, chunkSize / 3);
        scores.splice(0, chunkSize / 3);
      }

      // Now we have new data on the Prompt Set that's why we need
      // to invalidate the caches so the new data will be fetched.
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            // Invalidate Prompt Set list queries
            query.queryKey[0] === QK_PROMPT_SETS ||
            // Invalidate Prompt list queries
            query.queryKey[0] === QK_PROMPTS,
        }),
      ]);

      toast.update(loadingToast, {
        render: "Data uploaded successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      ctx.setIsResultsUploaded(true);
    } catch (error) {
      console.error(error);
      toast.error(`Upload failed: ${errorMessage(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const prepareDownloadFile = async () => {
    if (ctx.results.length === 0) {
      throw new Error("Nothing to download");
    }

    const responses = ctx.results
      .filter((r) => r.response !== undefined)
      .map((result) => result.response);
    const scores = ctx.results
      .map((r) => r.score)
      .filter((r) => r !== undefined);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `results-${timestamp}.json`;

    return {
      data: JSON.stringify([...responses, ...scores], null, 2),
      filename,
    };
  };

  const uploadBlockerMessage = useMemo(() => {
    if (ctx.isResultsUploaded) {
      return "Upload is already done";
    }

    if (isUploading || ctx.isUploading) {
      return "Upload in progress. Please wait.";
    }

    if (ctx.results.length === 0) {
      return "Nothing to upload";
    }

    if (ctx.promptsSource === "file" && !ctx.selectedPromptSet) {
      return "Please select a Benchmark for the new Prompts";
    }

    if (ctx.scoringMethod === "human" && !ctx.areAllResponsesScored) {
      return "Please score all responses before uploading";
    }
  }, [
    ctx.isResultsUploaded,
    isUploading,
    ctx.isUploading,
    ctx.results.length,
    ctx.promptsSource,
    ctx.selectedPromptSet,
    ctx.scoringMethod,
    ctx.areAllResponsesScored,
  ]);

  const downloadBlockerMessage = useMemo(() => {
    if (ctx.results.length === 0) {
      return "Nothing to download";
    }

    return;
  }, [ctx.results.length]);

  if (ctx.results.length === 0 || ctx.isRunning) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save</CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-1/2 space-y-3 my-auto">
            {extraEnabled && (
              <RadioGroup
                value={uploadOption}
                onValueChange={(value) =>
                  setUploadOption(value as UploadOption)
                }
                disabled={isUploading || Boolean(uploadBlockerMessage)}
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
                          The Prompts (new ones), Responses and Scores will be
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
                          The Prompts (new ones), Responses and Scores will be
                          uploaded without their data. They will be associated
                          with the chosen Benchmark. The Scores will be visible
                          by the users who has access to the Benchmark but
                          contents of the Responses and the Prompts will not be
                          visible.
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}

            <Tooltip open={!Boolean(uploadBlockerMessage) ? false : undefined}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    onClick={handleUpload}
                    disabled={Boolean(uploadBlockerMessage)}
                    variant="default"
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    {isUploading ? (
                      <>
                        <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : ctx.isResultsUploaded ? (
                      "Uploaded"
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
              Download the raw data of the Prompts (new ones), Responses and
              Scores (if there are). You can use this file to store your data
              manually or later to reveal your Prompts/Responses if you have
              uploaded them as hidden.
            </p>
            <Tooltip
              open={!Boolean(downloadBlockerMessage) ? false : undefined}
            >
              <TooltipTrigger asChild>
                <div className="w-full">
                  <DownloadButton
                    content={prepareDownloadFile}
                    mimeType="application/json"
                    disabled={Boolean(downloadBlockerMessage)}
                    className="w-full"
                    variant="outline"
                    onDownloadError={(error) => {
                      toast.error(`Download failed: ${errorMessage(error)}`);
                    }}
                  >
                    Download Data
                  </DownloadButton>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{downloadBlockerMessage}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
