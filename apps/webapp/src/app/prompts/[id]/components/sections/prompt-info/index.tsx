import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideCalendar, LucideHash, LucideTag } from "lucide-react";
import { DateTime } from "luxon";
import { CopyButton } from "@/components/copy-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PromptStatuses } from "@/database/types";
import IncludedByPromptSetLink from "@/components/included-by-prompt-set-link";
import { PromptTypes } from "peerbench";
import { MetadataAccordion } from "@/components/metadata-accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { capitalize } from "@/utils/capitalize";
import type { GetPromptsReturnItem } from "@/services/prompt.service";
import { FeedbackButtons } from "./feedback-buttons";
import { PromptComments } from "@/components/prompt-comments";
import {
  getPromptFeedbackStatus,
  PROMPT_FEEDBACK_STATUS_UI,
} from "@/lib/prompt-feedback-status";

export interface PromptInfoProps {
  prompt: GetPromptsReturnItem;
  tags: string[];
  userId?: string;
}

export default function PromptInfo({ prompt, tags, userId }: PromptInfoProps) {
  // Combine metadata with identifiers
  const extendedMetadata = {
    ...(prompt.metadata || {}),
    identifiers: {
      question: {
        cid: prompt.cid,
        sha256: prompt.sha256,
      },
      fullPrompt: {
        cid: prompt.fullPromptCID,
        sha256: prompt.fullPromptSHA256,
      },
    },
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-gray-700">
              <div className="flex items-center">
                <CopyButton text={prompt.id} variant="ghost">
                  <div className="flex items-center">
                    <LucideHash size={16} />
                    <span className="font-mono ml-2 mr-1 text-[14px]">
                      {prompt.id}
                    </span>
                  </div>
                </CopyButton>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"></div>
              </div>
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {capitalize(prompt.type, true, "-")}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="px-3 py-1 cursor-help">
                  <LucideCalendar className="w-3 h-3 mr-1" />
                  {DateTime.fromJSDate(new Date(prompt.createdAt)).toRelative()}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {DateTime.fromJSDate(new Date(prompt.createdAt)).toFormat(
                    "TTT, DD"
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-sm">
          {prompt.includedInPromptSets.map((promptSet, i) => (
            <div className="flex items-end" key={promptSet.id}>
              {promptSet.promptStatus !== PromptStatuses.included ? (
                <Tooltip>
                  <TooltipTrigger>
                    <IncludedByPromptSetLink
                      promptSetId={promptSet.id}
                      promptSetTitle={promptSet.title}
                      promptStatus={promptSet.promptStatus}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    The Prompt is excluded from this benchmark
                  </TooltipContent>
                </Tooltip>
              ) : (
                <IncludedByPromptSetLink
                  promptSetId={promptSet.id}
                  promptSetTitle={promptSet.title}
                  promptStatus={promptSet.promptStatus}
                />
              )}
              {i !== prompt.includedInPromptSets.length - 1 && ", "}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between flex-wrap">
          {/* Feedback Status Section */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Status</div>
            <div className="flex items-center">
              {(() => {
                const status = getPromptFeedbackStatus({
                  positiveQuickFeedbackCount: prompt.positiveQuickFeedbackCount,
                  negativeQuickFeedbackCount: prompt.negativeQuickFeedbackCount,
                });
                const ui = PROMPT_FEEDBACK_STATUS_UI[status];
                return (
                  <div className={`text-lg font-semibold ${ui.className}`}>
                    {ui.label}
                  </div>
                );
              })()}
            </div>
          </div>

          {userId && (
            <FeedbackButtons
              promptId={prompt.id}
              userFeedback={prompt.userQuickFeedback}
            />
          )}
        </div>

        {/* Prompt Content Section */}
        <div className="space-y-4">
          {prompt.isRevealed ? (
            <Tabs defaultValue="full-prompt" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="question">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">Question</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Raw question. It may not be the actual Prompt data that is
                      being sent to the models.
                    </TooltipContent>
                  </Tooltip>
                </TabsTrigger>

                <TabsTrigger value="full-prompt">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">Full Prompt</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Full Prompt. It is the actual Prompt data that is being
                      sent to the models.
                    </TooltipContent>
                  </Tooltip>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="question" className="mt-4">
                <div className="p-6 rounded-lg border bg-card-content-container border-card-content-container-border">
                  <pre className="whitespace-pre-wrap font-mono text-lg text-gray-800 leading-relaxed">
                    {prompt.question}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="full-prompt" className="mt-4">
                <div
                  className="p-6 rounded-lg border"
                  style={{
                    backgroundColor: "var(--color-card-content-container)",
                    borderColor: "var(--color-card-content-container-border)",
                  }}
                >
                  <pre className="whitespace-pre-wrap font-mono text-lg text-gray-800 leading-relaxed">
                    {prompt.fullPrompt}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="p-6 rounded-lg border bg-gray-50 border-gray-200">
              <p className="text-gray-600 italic text-center">
                Prompt is not revealed yet
              </p>
            </div>
          )}

          {/* Answer Section - For Multiple Choice Prompts */}
          {prompt.isRevealed &&
            prompt.type === PromptTypes.MultipleChoice &&
            prompt.options &&
            typeof prompt.options === "object" &&
            !Array.isArray(prompt.options) &&
            prompt.answerKey &&
            prompt.options[prompt.answerKey] && (
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Correct Answer
                </h4>
                <div className="p-6 flex items-center gap-2 bg-green-50 border-2 border-green-200 rounded-lg shadow-sm">
                  <span className="font-semibold text-gray-800 text-lg">
                    {prompt.answerKey.toUpperCase()}
                  </span>
                  <pre className="whitespace-pre-wrap font-mono text-gray-800 text-lg">
                    -{" "}
                    {prompt.options[prompt.answerKey] !== null &&
                    prompt.options[prompt.answerKey] !== undefined
                      ? String(prompt.options[prompt.answerKey])
                      : "N/A"}
                  </pre>
                </div>
              </div>
            )}

          {/* Answer Section - For Non-Multiple Choice Prompts */}
          {prompt.isRevealed &&
            prompt.type !== PromptTypes.MultipleChoice &&
            prompt.answer && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  Expected/Correct Answer
                </h4>
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg shadow-sm">
                  <pre className="whitespace-pre-wrap font-mono text-gray-800 leading-relaxed text-lg">
                    {prompt.answer}
                  </pre>
                </div>
              </div>
            )}
        </div>

        {/* Metadata Section */}
        <MetadataAccordion title="Metadata" metadata={extendedMetadata} />

        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LucideTag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <PromptComments
          promptId={prompt.id}
          variant="accordion"
          defaultOpen={false}
        />
      </CardContent>
    </Card>
  );
}
