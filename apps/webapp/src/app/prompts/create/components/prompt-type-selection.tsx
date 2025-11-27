"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { PromptType, PromptTypes } from "peerbench";
import { usePageContext } from "../context";
import { capitalize } from "@/utils/capitalize";
import { useEffect } from "react";

export default function PromptTypeSelection() {
  const ctx = usePageContext();

  const handlePromptTypeChange = (promptType: PromptType) => {
    ctx.setSelectedPromptType(promptType);
    ctx.clearPrompt();
  };

  useEffect(() => {
    if (ctx.generationMode === "llm-generated") {
      ctx.setSelectedPromptType(PromptTypes.MultipleChoice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.generationMode]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        3. Prompt Type
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(PromptTypes).map((value) => (
          <Button
            variant={"outline"}
            key={value}
            disabled={
              // We only have Generators for those types
              (value !== PromptTypes.MultipleChoice &&
                value !== PromptTypes.OpenEnded &&
                value !== PromptTypes.OpenEndedWithDocs &&
                ctx.generationMode === "llm-generated") ||
              ctx.isInProgress
            }
            onClick={() => handlePromptTypeChange(value as PromptType)}
            className={cn(
              "py-7 rounded-lg border-2 transition-all duration-200 text-left",
              ctx.selectedPromptType === value
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="font-medium capitalize">
              {capitalize(value.split("-").join(" "), true)}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
