"use client";

import { motion } from "motion/react";
import { usePageContext } from "./context";
import PromptInput from "./components/prompt-input";
import ResponseComparison from "./components/response-comparison";
import RatingSection from "./components/rating-section";
import { useRef, useEffect } from "react";
import { LucideGitCompare } from "lucide-react";

export default function ComparePage() {
  const ctx = usePageContext();
  const responseComparisonRef = useRef<HTMLDivElement>(null);
  const prevIsGenerating = useRef(false);

  // Scroll to comparison section when generation finishes
  useEffect(() => {
    // Only scroll if we just transitioned from generating to not generating
    if (prevIsGenerating.current && !ctx.isGenerating && ctx.currentComparison) {
      // Wait a bit for the component to render
      setTimeout(() => {
        responseComparisonRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
    
    // Update the previous value
    prevIsGenerating.current = ctx.isGenerating;
  }, [ctx.isGenerating, ctx.currentComparison]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px] text-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <LucideGitCompare className="h-10 w-10 text-gray-700" />
            <h1 className="text-4xl font-bold text-gray-700">
              Model Comparison Battleground
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Find the best AI for your use case. Compare answers across top AI models side-by-side
            and power our public leaderboard.
          </p>
        </div>

        {/* Prompt Input */}
        <PromptInput />

        {/* Response Comparison - only show if we have responses */}
        {ctx.currentComparison && (
          <div ref={responseComparisonRef}>
            <ResponseComparison />
          </div>
        )}

        {/* Rating Section - only show if we have responses */}
        {ctx.currentComparison && <RatingSection />}
      </motion.div>
    </main>
  );
}

