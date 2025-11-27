"use client";

import { motion } from "motion/react";
import {
  NewCreatedPromptSet,
  usePromptSetAPI,
} from "@/lib/hooks/use-prompt-set-api";
import { GenerateInvitationLinks } from "./components/generate-invitation-links";
import PromptSetInputForm from "@/components/prompt-set-input-form";
import { useState } from "react";
import { PromptSetFormData } from "@/components/prompt-set-input-form/context";
import { useQueryClient } from "@tanstack/react-query";
import { QK_PROMPT_SETS } from "@/lib/react-query/query-keys";
import { LucideFileCog } from "lucide-react";

export default function CreatePromptSetPage() {
  const promptSetAPI = usePromptSetAPI();
  const [promptSet, setPromptSet] = useState<NewCreatedPromptSet | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const queryClient = useQueryClient();

  const onSubmit = async (data: PromptSetFormData) => {
    const promptSet = await promptSetAPI.createPromptSet({
      title: data.title,
      description: data.description,
      license: data.license,
      category: data.category ?? undefined,
      citationInfo: data.citationInfo,
      isPublic: data.isPublic,
      isPublicSubmissionsAllowed: data.isPublicSubmissionsAllowed,
    });

    // Invalidate the Prompt Set list query to include this new one
    await queryClient.invalidateQueries({ queryKey: [QK_PROMPT_SETS] });

    setPromptSet(promptSet);
    setIsPublic(data.isPublic && data.isPublicSubmissionsAllowed);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-3">
          <LucideFileCog className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-700">
            {
              // If the Prompt Set creation step is done, then show the invitation page
              promptSet
                ? `Congrats! You have created a new benchmark!`
                : `Create Benchmark`
            }
          </h1>
        </div>

        {promptSet ? (
          <GenerateInvitationLinks promptSet={promptSet} isPublic={isPublic} />
        ) : (
          <PromptSetInputForm
            onSubmit={onSubmit}
            submitButtonTexts={{
              plain: "Create",
              loading: "Creating...",
            }}
          />
        )}
      </motion.div>
    </main>
  );
}
