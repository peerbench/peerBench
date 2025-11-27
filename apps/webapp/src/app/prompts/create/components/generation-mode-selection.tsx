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
    <div className="bg-white rounded-lg flex flex-col shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        2. Generation Mode
      </h2>
      <div className="flex flex-col flex-1 justify-between flex-wrap">
        <div className="grid grid-cols-2 gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={onManualModeClick}
            disabled={ctx.isInProgress}
            className={cn(
              "!p-6 w-full h-full rounded-lg border-2 transition-all duration-200 text-left",
              ctx.generationMode === "manual"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="font-medium">Manual</div>
          </Button>
          <Button
            variant="outline"
            onClick={onLLMGenerationModeClick}
            disabled={ctx.isInProgress}
            className={cn(
              "!p-6 w-full h-full rounded-lg border-2 transition-all duration-200 text-left",
              ctx.generationMode === "llm-generated"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="font-medium">LLM-aided</div>
          </Button>
        </div>
        <p className="flex-1 flex flex-col-reverse text-sm text-gray-500">
          {ctx.generationMode === "manual"
            ? `You need to write the question and the expected answer (or possible answers) manually.`
            : `You can use an LLM model to generate the question and the expected answer (or possible answers). You just need to provide instructions (how the question should be generated) and an input text that is going to be used as the source.`}
        </p>
      </div>
    </div>
  );
}
