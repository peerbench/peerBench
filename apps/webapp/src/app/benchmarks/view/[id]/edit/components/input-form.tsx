"use client";

import { PromptSetFormData } from "@/components/prompt-set-input-form/context";
import { usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { toast } from "react-toastify";
import { GetPromptSetsReturnItem } from "@/services/promptset.service";
import PromptSetInputForm from "@/components/prompt-set-input-form";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { QK_PROMPT_SETS } from "@/lib/react-query/query-keys";

export default function InputForm({
  promptSet,
}: {
  promptSet: GetPromptSetsReturnItem;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const promptSetAPI = usePromptSetAPI();

  const handleSubmit = async (data: PromptSetFormData) => {
    await promptSetAPI.updatePromptSet(promptSet.id, {
      title: data.title,
      description: data.description,
      citationInfo: data.citationInfo,
      license: data.license,
      isPublic: data.isPublic,
      isPublicSubmissionsAllowed: data.isPublicSubmissionsAllowed,
      category: data.category || undefined,
      tags: data.tags,
    });

    await queryClient.invalidateQueries({ queryKey: [QK_PROMPT_SETS] });

    toast.success("Benchmark updated");
    router.push(`/benchmarks/view/${promptSet.id}`);
  };

  return (
    <PromptSetInputForm
      onSubmit={handleSubmit}
      defaultValues={
        promptSet
          ? {
              title: promptSet?.title,
              description: promptSet?.description,
              citationInfo: promptSet?.citationInfo,
              license: promptSet?.license,
              isPublic: promptSet?.isPublic,
              isPublicSubmissionsAllowed: promptSet?.isPublicSubmissionsAllowed,
              category: promptSet?.category,
              tags: promptSet.tags,
            }
          : undefined
      }
      submitButtonTexts={{
        plain: "Save",
        loading: "Saving...",
      }}
    />
  );
}
