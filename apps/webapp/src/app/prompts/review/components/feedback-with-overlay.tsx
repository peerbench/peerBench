"use client";

import { useState } from "react";
import Feedback from "./feedback";
import PromptSection, { PromptSectionProps } from "./prompt-section";

export interface FeedbackWithOverlayProps {
  promptId: string;
  prompt: PromptSectionProps["prompt"];
}

export default function FeedbackWithOverlay({
  promptId,
  prompt,
}: FeedbackWithOverlayProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      <Feedback
        promptId={promptId}
        onSubmittingChange={setIsSubmitting}
      />
      <div className="relative">
        <PromptSection prompt={prompt} />
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-lg font-medium text-gray-700">
                Submitting feedback...
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

