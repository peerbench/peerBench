"use client";

import { cn } from "@/utils/cn";
import { usePageContext } from "../context";
import { Button } from "@/components/ui/button";

export default function GenerationModeSelection() {
  const ctx = usePageContext();

  const onManualModeClick = () => {
    if (ctx.generationMode === "manual") {
      return;
    }

    ctx.setGenerationMode("manual");
    ctx.setLLMGenerationConfig({
      instructions: "",
      input: "",
      isGenerating: false,
      selectedGenerationModel: null,
    });
    ctx.clearPrompt();
  };

  const onLLMGenerationModeClick = () => {
    if (ctx.generationMode === "llm-generated") {
      return;
    }

    ctx.setGenerationMode("llm-generated");
    ctx.clearPrompt();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-5">
        2. Generation Mode
      </h2>
      <div className="flex flex-col flex-1 gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="ghost"
            onClick={onManualModeClick}
            disabled={ctx.isInProgress}
            className={cn(
              "h-auto py-4 px-5 justify-start text-base font-normal transition-all",
              ctx.generationMode === "manual"
                ? "border-1 border-blue-500 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-500"
                : "border border-border hover:bg-muted hover:border-muted-foreground/20"
            )}
          >
            Manual
          </Button>
          <Button
            variant="ghost"
            onClick={onLLMGenerationModeClick}
            disabled={ctx.isInProgress}
            className={cn(
              "h-auto py-4 px-5 justify-start text-base font-normal transition-all",
              ctx.generationMode === "llm-generated"
                ? " border-1 border-green-500 bg-green-50 text-green-600 shadow-sm hover:border-green-500"
                : "border border-border hover:bg-muted hover:border-muted-foreground/20"
            )}
          >
            LLM-aided
          </Button>
        </div>
        <p className="flex-1 flex flex-col-reverse text-sm text-gray-500">
          {ctx.generationMode === "manual"
            ? `You need to write the question and the expected answer (or possible answers) manually.`
            : `You can use an LLM model to generate the question and the expected answer (or possible answers). You just need to provide instructions (how the question should be generated) and an input text that is going to be used as the source.`}
        </p>
      </div>
    </section>
  );
}
