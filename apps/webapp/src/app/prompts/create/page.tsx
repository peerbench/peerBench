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
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";

export default function PromptCreatorPage() {
  const ctx = usePageContext();
  const [extrasEnabled] = useSettingExtra();

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 mb-[200px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <LucideMessageSquareText className="h-7 w-7 text-foreground" />
          <h1 className="text-3xl font-semibold text-foreground">
            Create Prompt
          </h1>
        </div>

        {/* Prompt Set Selection */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
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
        </section>

        <div
          className={
            extrasEnabled ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""
          }
        >
          {extrasEnabled && <GenerationModeSelection />}
          <PromptTypeSelection />
        </div>

        <div className="space-y-4">
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
