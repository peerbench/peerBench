"use client";

import { motion } from "motion/react";
import { usePageContext } from "./context";
import { MessageModal } from "@/components/modals/message-modal";
import { LucideAlertTriangle, LucideMessageSquareText } from "lucide-react";
import LLMGeneration from "./components/llm-generation";
import GenerationModeSelection from "./components/generation-mode-selection";
import PromptTypeSelection from "./components/prompt-type-selection";
import PromptInformation from "./components/prompt-information";
import TestPrompt from "./components/test-prompt";
import PromptSetSelect from "@/components/prompt-set-select";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { UploadDownloadButtons } from "./components/upload-download-buttons";

export default function PromptCreatorPage() {
  const ctx = usePageContext();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-3">
          <LucideMessageSquareText className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-700">Create Prompt</h1>
        </div>

        {/* Prompt Set Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            1. Destination Benchmark for the new Prompt
          </h2>
          <PromptSetSelect
            accessReason={PromptSetAccessReasons.submitPrompt}
            value={ctx.selectedPromptSet}
            onChange={ctx.setSelectedPromptSet}
            disabled={ctx.isInProgress}
            placeholder="Select a Benchmark..."
            id="prompt-set-select-create"
            urlParamName="promptSetId"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GenerationModeSelection />
          <PromptTypeSelection />
        </div>
        <div className="space-y-6">
          {ctx.generationMode === "llm-generated" && <LLMGeneration />}
          <PromptInformation />
        </div>
        <TestPrompt />

        <UploadDownloadButtons />

        {ctx.noValidProvider && (
          <MessageModal
            message="There is no any valid Provider configuration found. You won't be able to use any LLM models. Please use the Settings page to configure API keys for the Providers."
            title="Warning"
            icon={<LucideAlertTriangle className="w-5 h-5 text-yellow-500" />}
          />
        )}
      </motion.div>
    </main>
  );
}
