"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { type PromptType, PromptTypes } from "peerbench";
import { usePageContext } from "../context";
import { capitalize } from "@/utils/capitalize";
import { useEffect } from "react";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";

export default function PromptTypeSelection() {
  const ctx = usePageContext();
  const [extrasEnabled] = useSettingExtra();
  const handlePromptTypeChange = (promptType: PromptType) => {
    ctx.setSelectedPromptType(promptType);
    ctx.clearPrompt();
  };
  const allowedTypes = !extrasEnabled
    ? [PromptTypes.MultipleChoice, PromptTypes.OpenEnded]
    : Object.values(PromptTypes);

  useEffect(() => {
    if (ctx.generationMode === "llm-generated") {
      ctx.setSelectedPromptType(PromptTypes.MultipleChoice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.generationMode]);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-5">
        {extrasEnabled ? "3. Prompt Type" : "2. Prompt Type"}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {allowedTypes.map((value) => (
          <Button
            variant="ghost"
            key={value}
            disabled={
              (value !== PromptTypes.MultipleChoice &&
                value !== PromptTypes.OpenEnded &&
                value !== PromptTypes.OpenEndedWithDocs &&
                ctx.generationMode === "llm-generated") ||
              ctx.isInProgress
            }
            onClick={() => handlePromptTypeChange(value as PromptType)}
            className={cn(
              "h-auto py-4 px-5 justify-start text-base font-normal transition-all",
              ctx.selectedPromptType === value
                ? "border-blue-500 border-1 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-500"
                : "border border-border hover:bg-muted hover:border-muted-foreground/20"
            )}
          >
            {capitalize(value.split("-").join(" "), true)}
          </Button>
        ))}
      </div>
    </section>
  );
}
