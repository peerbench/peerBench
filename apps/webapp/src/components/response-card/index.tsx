import { Card, CardContent, CardHeader } from "../ui/card";
import {
  LucideClock,
  LucideBuilding2,
  LucideCheckCircle,
  LucideXCircle,
  LucideHash,
  LucideFileText,
} from "lucide-react";
import { DateTime } from "luxon";
import { capitalize } from "@/utils/capitalize";
import { MarkdownTruncatedText } from "../markdown-truncated-text";
import { findComponent } from "@/utils/client/find-component";
import { Header } from "./header";
import { Footer } from "./footer";
import { Comments } from "./comments";
import { Button } from "../ui/button";
import { MetadataAccordion } from "../metadata-accordion";
import { QuickFeedbackButtons } from "../quick-feedback-buttons";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";

export interface ResponseCardProps {
  responseId?: string;
  response: string | null;
  isRevealed?: boolean | null;
  startedAt: string;
  finishedAt: string;
  metadata?: Record<string, any>;
  modelInfo: { modelId?: string; provider?: string };
  score?: number;
  avgScore?: number;
  children?: React.ReactNode;
  systemPrompt?: string | null;
  onScoreDetailsClick?: () => void;
}

function ResponseCard({
  modelInfo,
  score,
  startedAt,
  finishedAt,
  response,
  metadata,
  avgScore,
  children,
  responseId,
  isRevealed,
  systemPrompt,
  onScoreDetailsClick,
}: ResponseCardProps) {
  return (
    <Card className="w-full">
      {findComponent(children, Header)}

      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">
                {modelInfo.modelId || "Unknown"}
              </h3>

              {findComponent(children, QuickFeedbackButtons)}
            </div>

            <div className="flex gap-3 text-sm text-gray-500 mt-1">
              <div className="flex gap-2 items-center">
                <LucideBuilding2 size={16} />
                {capitalize(modelInfo.provider || "Unknown", true)}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
              {startedAt && finishedAt && (
                <div className="flex gap-2 items-center">
                  <LucideClock size={14} />
                  <span>
                    {DateTime.fromISO(finishedAt).toFormat("TTT, DD")}
                  </span>
                </div>
              )}
            </div>

            {responseId && (
              <div className="flex gap-1 items-center text-sm text-gray-500 mt-1">
                <LucideHash size={14} />
                {responseId}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getScoreIcon(score)}
            <div className={`flex flex-col gap-2 font-semibold`}>
              {score !== undefined && `Final Score: ${score}`}
              {avgScore !== undefined ? (
                <div className="flex flex-col items-end gap-2">
                  <div className={`${getScoreColor(avgScore)}`}>
                    Avg. Score: {avgScore.toFixed(2)}
                  </div>
                  {onScoreDetailsClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onScoreDetailsClick}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-gray-600">Not scored yet</div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isRevealed ? (
          <MarkdownTruncatedText
            className="break-words bg-card-content-container border border-card-content-container-border p-3 rounded-md text-sm font-sans"
            text={response || ""}
            maxLength={250}
          />
        ) : (
          <div className="text-gray-600 italic p-3 border rounded-lg bg-gray-50 border-gray-200">
            Response is not revealed yet
          </div>
        )}
        {systemPrompt && systemPrompt.trim() !== "" && (
          <Accordion type="single" collapsible>
            <AccordionItem value="system-prompt">
              <AccordionTrigger className="pl-4 pt-4 pb-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <LucideFileText size={16} />
                  System Prompt
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-5 bg-card-content-container">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {systemPrompt}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        {findComponent(children, Comments)}
        {metadata && Object.keys(metadata).length > 0 && (
          <MetadataAccordion metadata={metadata} />
        )}
      </CardContent>

      {findComponent(children, Footer)}
    </Card>
  );
}

function getScoreColor(score?: number) {
  if (score === undefined) return "text-gray-600";
  if (score > 0.8) return "text-green-600";
  if (score > 0.5) return "text-yellow-600";
  return "text-red-600";
}

function getScoreIcon(score?: number) {
  if (score === undefined) return <></>;
  if (score > 0.5)
    return <LucideCheckCircle className="text-green-600" size={16} />;
  return <LucideXCircle className="text-red-600" size={16} />;
}

ResponseCard.Header = Header;
ResponseCard.Footer = Footer;
ResponseCard.QuickFeedbackButtons = QuickFeedbackButtons;
ResponseCard.Comments = Comments;

export { ResponseCard };
