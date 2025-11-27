"use client";

import { ValidFormats } from "./components/valid-formats";
import { EntityPreviewHeader } from "./components/entity-preview-header";
import { SelectorButtons } from "./components/selector-buttons";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import {
  LucideFileCog,
  LucideUpload,
  LucideMessageCircle,
  LucideStar,
  LucideEye,
  LucideLock,
} from "lucide-react";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { usePageContext } from "./context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PromptsPreview from "@/components/prompts-preview";
import { ResponsesPreview } from "@/components/responses-preview";
import ScoresPreview from "@/components/scores-preview";
import PromptSetSelect from "@/components/prompt-set-select";
import { DownloadButton } from "@/components/download-button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropZone } from "@/components/file-drop-zone";
import { EntityCounts } from "./components/entity-counts";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function UploadPage() {
  const ctx = usePageContext();
  const [settingExtra] = useSettingExtra();
  const [quickUploadSelection, setQuickUploadSelection] = useState<
    "revealed" | "hidden"
  >("revealed");

  const handleFileSelect = async (file: File) => {
    if (!file) {
      return;
    }

    const infoToast = toast.info("Parsing file...", {
      autoClose: false,
      isLoading: true,
    });

    ctx
      .uploadFile(file)
      .then((isStdFormat) => {
        if (!isStdFormat) {
          toast.update(infoToast, {
            isLoading: false,
            type: "warning",
            render:
              "Your task file doesn't follow standard peerBench format. Please use the 'Convert to peerBench Format' button to convert it. Then use the converted file for uploading.",
            autoClose: 5000,
          });
        } else {
          toast.update(infoToast, {
            isLoading: false,
            type: "success",
            render: "File parsed successfully!",
            autoClose: 5000,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        toast.update(infoToast, {
          isLoading: false,
          type: "error",
          render: errorMessage(err),
          autoClose: 5000,
        });
      });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !ctx.uploadedFileName ||
      (ctx.prompts.length === 0 &&
        ctx.responses.length === 0 &&
        ctx.scores.length === 0)
    ) {
      toast.error("Please select a valid file");
      return;
    }

    if (!ctx.selectedPromptSet) {
      toast.error("Please select a Benchmark");
      return;
    }

    if (!ctx.isUploadedFileFollowsStandardFormat) {
      toast.error(
        "Please convert your file doesn't follow standard peerBench format"
      );
      return;
    }

    const infoToast = toast.loading("Uploading...");
    ctx
      .uploadData()
      .then(() => {
        toast.update(infoToast, {
          render: "Upload successful!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        ctx.clear();
      })
      .catch((err) => {
        console.error(err);
        toast.update(infoToast, {
          render: `Upload failed: ${errorMessage(err)}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      });
  };

  const getConvertToPBContent = () => {
    if (!ctx.uploadedFileName) {
      throw new Error("No file selected");
    }
    return {
      data: JSON.stringify([...ctx.prompts, ...ctx.responses, ...ctx.scores]),
      filename: `${ctx.uploadedFileName.replace(/\.[^/.]+$/, "")}.peerbench.json`,
    };
  };

  const handleConvertToPBError = (error: Error) => {
    toast.error(`Failed to convert file: ${errorMessage(error)}`);
    console.error(error);
  };

  const handleQuickUploadSelectionChange = (value: "revealed" | "hidden") => {
    if (value === "revealed") {
      ctx.setPrompts((prev) =>
        prev.map((prompt) => {
          return {
            ...prompt,
            upload: prompt.isRegistered === true ? false : true,
            reveal: prompt.isRevealed === true ? false : true,
          };
        })
      );
      ctx.setResponses((prev) =>
        prev.map((response) => {
          return {
            ...response,
            upload: response.isRegistered === true ? false : true,
            reveal: response.isRevealed === true ? false : true,
          };
        })
      );
      ctx.setScores((prev) =>
        prev.map((score) => {
          return {
            ...score,
            upload: score.isRegistered === true ? false : true,
          };
        })
      );
    } else {
      ctx.setPrompts((prev) =>
        prev.map((prompt) => {
          return {
            ...prompt,
            upload: prompt.isRegistered === true ? false : true,
            reveal: prompt.isRevealed !== true ? false : prompt.reveal,
          };
        })
      );
      ctx.setResponses((prev) =>
        prev.map((response) => {
          return {
            ...response,
            upload: response.isRegistered === true ? false : true,
            reveal: response.isRevealed !== true ? false : response.reveal,
          };
        })
      );
      ctx.setScores((prev) =>
        prev.map((score) => {
          return {
            ...score,
            upload: score.isRegistered === true ? false : true,
          };
        })
      );
    }
    setQuickUploadSelection(value);
  };

  // Reset selection to the default when a new file is selected
  useEffect(() => {
    setQuickUploadSelection("revealed");
  }, [ctx.uploadedFileName]);

  return (
    <main className="max-w-7xl mx-auto space-y-6 py-8 px-4 sm:px-6 lg:px-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <LucideUpload className="h-8 w-8 text-foreground" />
          <h1 className="text-3xl font-bold text-foreground">Upload</h1>
        </div>
        <p className="text-muted-foreground">
          Upload your existing data to peerBench
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={onSubmit}
            className="space-y-6 grid grid-cols-2 gap-6"
          >
            {/* File Upload Section */}
            <div className="space-y-4 col-span-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <LucideUpload className="w-4 h-4" />
                  <div>Upload File</div>
                  {ctx.uploadedFileName && (
                    <div className="text-xs text-muted-foreground rounded">
                      {ctx.uploadedFileName.slice(0, 30)}{" "}
                      {ctx.uploadedFileName.length > 30 ? "..." : ""}
                    </div>
                  )}
                </label>
                <FileDropZone
                  onFileSelect={handleFileSelect}
                  accept=".json,.jsonl,.parquet"
                  disabled={ctx.isUploading || ctx.isParsing}
                  selectedFileName={ctx.uploadedFileName}
                  acceptDescription="Supports: .json, .jsonl, .parquet"
                />
              </div>

              {!ctx.isUploadedFileFollowsStandardFormat && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    Your file needs to be converted to PeerBench format
                  </p>
                  <DownloadButton
                    content={getConvertToPBContent}
                    mimeType="application/json"
                    className="w-fit"
                    variant="secondary"
                    size="sm"
                    disabled={ctx.isUploading || ctx.isParsing}
                    onDownloadError={handleConvertToPBError}
                  >
                    Convert to peerBench Format
                  </DownloadButton>
                </div>
              )}

              {/* Valid Schemas Info Section */}
              {!ctx.uploadedFileName && (
                <div className="flex flex-col space-y-2 col-span-2">
                  <ValidFormats />
                </div>
              )}
            </div>

            {/* Preview Tabs Section */}
            {ctx.isUploadedFileFollowsStandardFormat &&
              (ctx.prompts.length > 0 ||
                ctx.responses.length > 0 ||
                ctx.scores.length > 0) && (
                <div className="w-full col-span-2 flex flex-col items-center">
                  <div className="text-sm text-muted-foreground self-start mb-3">
                    Click one of the entities to show more details
                  </div>
                  <Tabs className="w-full">
                    <TabsList className="mb-3 w-full h-fit flex bg-transparent">
                      <TabsPrimitive.Trigger
                        value="prompts"
                        className="text-md w-fit h-fit flex-1"
                        asChild
                      >
                        <EntityCounts
                          entityName="Prompts"
                          icon={LucideFileCog}
                          foundCount={ctx.prompts.length}
                          isLoading={
                            ctx.promptsToBeProcessedInfo.isLoadingStatuses
                          }
                          revealCount={
                            ctx.promptsToBeProcessedInfo.toBeRevealedCount
                          }
                          uploadCount={
                            ctx.promptsToBeProcessedInfo.toBeUploadedCount
                          }
                        />
                      </TabsPrimitive.Trigger>
                      <TabsPrimitive.Trigger
                        value="responses"
                        className="text-md w-fit h-fit flex-1"
                        asChild
                      >
                        <EntityCounts
                          entityName="Responses"
                          icon={LucideMessageCircle}
                          foundCount={ctx.responses.length}
                          isLoading={
                            ctx.responsesToBeProcessedInfo.isLoadingStatuses
                          }
                          revealCount={
                            ctx.responsesToBeProcessedInfo.toBeRevealedCount
                          }
                          uploadCount={
                            ctx.responsesToBeProcessedInfo.toBeUploadedCount
                          }
                        />
                      </TabsPrimitive.Trigger>
                      <TabsPrimitive.Trigger
                        value="scores"
                        className="text-md w-fit h-fit flex-1"
                        asChild
                      >
                        <EntityCounts
                          entityName="Scores"
                          icon={LucideStar}
                          foundCount={ctx.scores.length}
                          isLoading={
                            ctx.scoresToBeProcessedInfo.isLoadingStatuses
                          }
                          uploadCount={
                            ctx.scoresToBeProcessedInfo.toBeUploadedCount
                          }
                        />
                      </TabsPrimitive.Trigger>
                    </TabsList>
                    <TabsContent value="prompts" className="space-y-4">
                      {ctx.prompts.length > 0 ? (
                        <>
                          {settingExtra === true && (
                            <SelectorButtons
                              entityType="prompts"
                              disabled={ctx.isUploading || ctx.isParsing}
                            />
                          )}
                          <PromptsPreview
                            prompts={ctx.prompts}
                            showCorrectAnswer={true}
                            isLoading={false}
                            collapsible={false}
                            renderHeader={(item) => (
                              <EntityPreviewHeader
                                item={item}
                                entityType="prompts"
                                isLoadingStatuses={
                                  ctx.promptsToBeProcessedInfo.isLoadingStatuses
                                }
                              />
                            )}
                          />
                        </>
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          No Prompts found
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="responses" className="space-y-4">
                      {ctx.responses.length > 0 ? (
                        <>
                          {settingExtra === true && (
                            <SelectorButtons
                              entityType="responses"
                              disabled={ctx.isUploading || ctx.isParsing}
                            />
                          )}
                          <ResponsesPreview
                            responses={ctx.responses}
                            collapsible={false}
                            renderHeader={(item) => (
                              <EntityPreviewHeader
                                item={item}
                                entityType="responses"
                                isLoadingStatuses={
                                  ctx.responsesToBeProcessedInfo
                                    .isLoadingStatuses
                                }
                              />
                            )}
                          />
                        </>
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          No Responses found
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="scores" className="space-y-4">
                      {ctx.scores.length > 0 ? (
                        <>
                          {settingExtra === true && (
                            <SelectorButtons
                              entityType="scores"
                              disabled={ctx.isUploading || ctx.isParsing}
                            />
                          )}
                          <ScoresPreview
                            scores={ctx.scores}
                            collapsible={false}
                            renderHeader={(item) => (
                              <EntityPreviewHeader
                                item={item}
                                entityType="scores"
                                isLoadingStatuses={
                                  ctx.scoresToBeProcessedInfo.isLoadingStatuses
                                }
                              />
                            )}
                          />
                        </>
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          No Scores found
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {!ctx.promptsToBeProcessedInfo.isLoadingStatuses &&
                    !ctx.responsesToBeProcessedInfo.isLoadingStatuses &&
                    !ctx.scoresToBeProcessedInfo.isLoadingStatuses && (
                      <div className="col-span-2 mt-4">
                        <RadioGroup
                          value={quickUploadSelection}
                          onValueChange={(value) =>
                            handleQuickUploadSelectionChange(
                              value as "revealed" | "hidden"
                            )
                          }
                          disabled={ctx.isUploading || ctx.isParsing}
                          className="space-y-3 flex gap-3"
                        >
                          <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1 h-full">
                            <RadioGroupItem
                              value="revealed"
                              id="upload-revealed"
                            />
                            <Label
                              htmlFor="upload-revealed"
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex space-x-2">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <LucideEye className="text-blue-500 w-4 h-4" />
                                    <div className="font-medium text-lg text-gray-600 dark:text-gray-300">
                                      Revealed
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Mark all Prompts, Responses and Scores to be
                                    uploaded with their data revealed. Users who
                                    have access to the chosen Benchmark will be
                                    able to see them.
                                  </div>
                                </div>
                              </div>
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1 h-full">
                            <RadioGroupItem value="hidden" id="upload-hidden" />
                            <Label
                              htmlFor="upload-hidden"
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex space-x-2">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <LucideLock className="text-red-500 w-4 h-4" />
                                    <div className="font-medium text-lg text-gray-600 dark:text-gray-300">
                                      Hidden
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Mark all Prompts, Responses and Scores to be
                                    uploaded without their data. They will be
                                    associated with the chosen Benchmark. Scores
                                    will be visible but contents of Responses
                                    and Prompts will not be visible.
                                  </div>
                                </div>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                </div>
              )}

            {/* Benchmark Selection Section */}
            <div className="col-span-2">
              <label className="flex gap-2 items-center text-sm font-medium text-foreground mb-2">
                <LucideFileCog className="w-4 h-4" /> Choose a Benchmark
              </label>
              <PromptSetSelect
                id="prompt-set-select"
                accessReason={PromptSetAccessReasons.submitPrompt}
                ref={ctx.promptSelectHandler}
                value={ctx.selectedPromptSet}
                onChange={ctx.setSelectedPromptSet}
                disabled={ctx.isUploading || ctx.isParsing}
                placeholder="Select a Benchmark..."
                urlParamName="promptSetId"
              />
            </div>

            <div className="col-span-2 flex justify-end">
              <Tooltip
                open={!Boolean(ctx.uploadBlockerMessage) ? false : undefined}
              >
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      disabled={Boolean(ctx.uploadBlockerMessage)}
                      size="lg"
                    >
                      <LucideUpload className="w-4 h-4 mr-2" />
                      {ctx.isParsing
                        ? "Parsing..."
                        : ctx.isUploading
                          ? "Uploading..."
                          : "Upload"}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{ctx.uploadBlockerMessage}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
