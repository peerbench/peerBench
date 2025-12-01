"use client";

import { motion } from "motion/react";
import { usePageContext } from "./context";
import { cn } from "@/utils/cn";
import LogsArea from "@/components/logs-area";
import ModelSelection from "./components/model-selection";
import ChoosePrompts from "./components/choose-prompts";
import Results from "./components/results";
import UploadResults from "./components/upload-results";
import RunAbortButtons from "./components/run-abort-buttons";
import SelectModelForAiScoring from "./components/select-model-for-ai-scoring";
import SelectScoringMethod from "./components/select-scoring-method";
import ScoreResponses from "./components/score-responses";
import { LucideWrench } from "lucide-react";

export default function BenchmarkPage() {
  const ctx = usePageContext();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px] text-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-3">
          <LucideWrench className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-700">Run Benchmark</h1>
        </div>

        <ModelSelection />
        <ChoosePrompts />

        <SelectScoringMethod />

        <SelectModelForAiScoring />

        <RunAbortButtons />
        <Results />
        <UploadResults />

        <ScoreResponses />

        <div
          className={cn(
            "bg-white rounded-lg shadow-lg p-6 border border-gray-200",
            { hidden: !ctx.isRunning && ctx.resultInfos.length === 0 }
          )}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Logs</h2>
          <LogsArea ref={ctx.logsHandler} />
        </div>
      </motion.div>
    </main>
  );
}
