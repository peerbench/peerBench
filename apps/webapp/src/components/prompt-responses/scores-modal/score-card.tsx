import { TruncatedText } from "@/components/truncated-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APIScoreItem } from "@/lib/hooks/use-score-api";
import { ScoringMethods } from "peerbench";
import { LucideBot, LucideHash, LucideUser, LucideZap } from "lucide-react";
import { ScoreComments } from "./score-comments";
import {
  QuickFeedbackButtons,
  QuickFeedbackButtonsProps,
} from "@/components/quick-feedback-buttons";

export interface ScoreCardProps {
  scoreInfo: APIScoreItem;
  onQuickFeedbackClick: QuickFeedbackButtonsProps<
    NonNullable<APIScoreItem["userQuickFeedback"]>
  >["onQuickFeedbackClick"];
  showComments?: boolean;
}

export function ScoreCard({
  scoreInfo,
  onQuickFeedbackClick,
  showComments = true,
}: ScoreCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex justify-between gap-1">
          <div className="flex items-center gap-1 text-lg font-semibold">
            <LucideHash size={18} />
            <div>{scoreInfo.id}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-bold text-black">Score: {scoreInfo.score}</div>
            <QuickFeedbackButtons
              entityName="Score"
              userQuickFeedback={scoreInfo.userQuickFeedback}
              onQuickFeedbackClick={onQuickFeedbackClick}
            />
          </div>
        </CardTitle>
        <div className="flex flex-col gap-3">
          {scoreInfo.scoringMethod === ScoringMethods.human && (
            <div className="flex gap-2 text-sm font-light text-muted-foreground">
              <LucideUser size={16} />
              <div className="flex flex-col gap-2">
                <div>Scored by a human</div>
                <div>User ID: {scoreInfo.scorerUserId}</div>
              </div>
            </div>
          )}
          {scoreInfo.scoringMethod === ScoringMethods.ai && (
            <div className="flex gap-2 text-sm font-light text-muted-foreground">
              <LucideBot size={16} />
              <div className="flex flex-col gap-2">
                <div>Scored by {scoreInfo.scorerModelName}</div>
                <div>Model ID: {scoreInfo.scorerModelId ?? "N/A"}</div>
                <div>Model Host: {scoreInfo.scorerModelHost ?? "N/A"}</div>
                <div>Model Owner: {scoreInfo.scorerModelOwner ?? "N/A"}</div>
                <div>
                  Model Provider: {scoreInfo.scorerModelProvider ?? "N/A"}
                </div>
              </div>
            </div>
          )}
          {scoreInfo.scoringMethod === ScoringMethods.algo && (
            <div className="flex gap-2 text-sm font-light text-muted-foreground">
              <LucideZap size={16} />
              <div className="flex flex-col gap-2">
                <div>Scored by pre-defined algorithm</div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Explanation
          </h3>
          <TruncatedText
            text={scoreInfo.explanation || "[No explanation provided]"}
            className="text-sm bg-gray-100 p-3 rounded border"
          />
        </div>
        {showComments && <ScoreComments scoreId={scoreInfo.id} />}
      </CardContent>
    </Card>
  );
}
