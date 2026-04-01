import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useCreateFeedback } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackWidget({ resultId }: FeedbackWidgetProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");

  const createFeedback = useCreateFeedback();

  const handleThumbClick = (sentiment: Sentiment) => {
    setSelectedSentiment(sentiment);
    setMode("form");
  };

  const handleCancel = () => {
    setSelectedSentiment(null);
    setComment("");
    setName("");
    setMode("idle");
  };

  const handleSubmit = () => {
    if (!selectedSentiment) return;

    createFeedback.mutate(
      {
        resultId,
        sentiment: selectedSentiment,
        comment: comment.trim() || undefined,
        name: name.trim() || undefined,
      },
      {
        onSuccess: () => {
          setMode("submitted");
        },
      }
    );
  };

  if (mode === "submitted") {
    const submittedName = name.trim() || "Anonymous";
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          {selectedSentiment === "positive" ? (
            <ThumbsUp className="size-6 text-green-600" />
          ) : (
            <ThumbsDown className="size-6 text-red-600" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              Thank you for your feedback!
            </p>
            {comment.trim() && (
              <p className="text-sm text-gray-600 mt-1">{comment.trim()}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">- {submittedName}</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "form" && selectedSentiment) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          {selectedSentiment === "positive" ? (
            <ThumbsUp className="size-5 text-green-600" />
          ) : (
            <ThumbsDown className="size-5 text-red-600" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {selectedSentiment === "positive" ? "Positive" : "Negative"}{" "}
            feedback
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <Textarea
              placeholder="Add a comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <div>
            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for Anonymous
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={createFeedback.isPending}
              size="sm"
            >
              {createFeedback.isPending ? "Submitting..." : "Submit"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={createFeedback.isPending}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-3">Was this evaluation helpful?</p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleThumbClick("positive")}
          className="hover:text-green-600 hover:bg-green-50"
          title="Thumbs up"
        >
          <ThumbsUp className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleThumbClick("negative")}
          className="hover:text-red-600 hover:bg-red-50"
          title="Thumbs down"
        >
          <ThumbsDown className="size-5" />
        </Button>
      </div>
    </div>
  );
}

type Sentiment = "positive" | "negative";
type Mode = "idle" | "form" | "submitted";

interface FeedbackWidgetProps {
  resultId: string;
}
