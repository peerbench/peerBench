"use client";

import ModelSelect, { ModelSelectValue } from "@/components/model-select";
import { LLMGenerationConfig, usePageContext } from "../context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MCQGenerator,
  OpenEndedGenerator,
  Prompt,
  PromptTypes,
} from "peerbench";
import { toast } from "react-toastify";
import { isAnyProviderLoading } from "@/lib/helpers/is-any-provider-loading";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth";

export default function LLMGeneration() {
  const ctx = usePageContext();
  const user = useAuth();

  const handleInstructionsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    ctx.setLLMGenerationConfig((prev: LLMGenerationConfig) => ({
      ...prev,
      instructions: e.target.value,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    ctx.setLLMGenerationConfig((prev: LLMGenerationConfig) => ({
      ...prev,
      input: e.target.value,
    }));
  };

  const handleModelSelected = (model: ModelSelectValue<false>) => {
    ctx.setLLMGenerationConfig((prev: LLMGenerationConfig) => ({
      ...prev,
      selectedGenerationModel: model,
    }));
  };

  const handleGenerateButtonClick = async () => {
    ctx.setLLMGenerationConfig((prev: LLMGenerationConfig) => ({
      ...prev,
      isGenerating: true,
    }));
    try {
      let prompts: Prompt[] = [];
      const provider =
        ctx.providers[
          ctx.llmGenerationConfig!.selectedGenerationModel!.provider
        ]!;
      if (ctx.selectedPromptType === PromptTypes.MultipleChoice) {
        const mcqGenerator = new MCQGenerator();
        await mcqGenerator.initialize();

        prompts = await mcqGenerator.generatePrompts(
          [ctx.llmGenerationConfig?.input],
          {
            parseInput: (input: string) => input,
            model: ctx.llmGenerationConfig!.selectedGenerationModel!.modelId,
            provider: provider.implementation,
            includeOriginalInputAsMetadata: true,
            additionalMetadata: (input: string, options) => ({
              "generated-via": "peerbench-webapp",
              instructions: ctx.llmGenerationConfig!.instructions,
              "generated-by-user-id": user?.id ?? undefined,
              "full-system-prompt": options.systemPrompt,
            }),
            systemPromptRules: [ctx.llmGenerationConfig!.instructions.trim()],
          }
        );
      } else if (ctx.selectedPromptType === PromptTypes.OpenEnded) {
        const openEndedGenerator = new OpenEndedGenerator();
        await openEndedGenerator.initialize();

        prompts = await openEndedGenerator.generatePrompts(
          [ctx.llmGenerationConfig?.input],
          {
            parseInput: (input: string) => input,
            model: ctx.llmGenerationConfig!.selectedGenerationModel!.modelId,
            provider: provider.implementation,
            includeOriginalInputAsMetadata: true,
            additionalMetadata: (input: string, options) => ({
              "generated-via-llm-model":
                ctx.llmGenerationConfig?.selectedGenerationModel?.modelId,
              "generated-via": "peerbench-webapp",
              "generated-by-user-id": user?.id ?? undefined,
              "full-system-prompt": options.systemPrompt,
              instructions: ctx.llmGenerationConfig!.instructions.trim(),
            }),
          }
        );
      } else {
        throw new Error("Invalid Prompt type");
      }

      if (prompts.length === 0) {
        toast.error(
          "Something went wrong while generating the Prompts. Please try again."
        );
      } else {
        ctx.setPrompt(prompts[0]!);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        `Failed to generate a Prompt: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      ctx.setLLMGenerationConfig((prev: LLMGenerationConfig) => ({
        ...prev,
        isGenerating: false,
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-4">
      <h2 className="text-xl font-semibold text-gray-700">4. Generation</h2>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block font-medium text-gray-700">
            Generation Model
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-300">
            The LLM model that is going to be used to generate the Prompts.
          </span>
        </div>
        <ModelSelect
          value={ctx.llmGenerationConfig?.selectedGenerationModel ?? null}
          options={ctx.modelSelectOptions}
          isLoading={isAnyProviderLoading(ctx.providers)}
          isMulti={false}
          onModelSelected={handleModelSelected}
          disabled={ctx.isInProgress}
        />

        <div>
          <label className="block font-medium text-gray-700 mb-2">
            Instructions
          </label>
          <Textarea
            value={ctx.llmGenerationConfig?.instructions}
            onChange={handleInstructionsChange}
            disabled={ctx.isInProgress}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={4}
            placeholder="Enter the instructions for the LLM about how the question should be generated from the input..."
          />
        </div>
        <div>
          <label className="block font-medium text-gray-700 mb-2">
            Input Text
          </label>
          <Textarea
            value={ctx.llmGenerationConfig?.input}
            onChange={handleInputChange}
            disabled={ctx.isInProgress}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={4}
            placeholder="Enter the text to be fed to the LLM..."
          />
        </div>

        <Button
          onClick={handleGenerateButtonClick}
          disabled={
            !ctx.llmGenerationConfig?.instructions.trim() ||
            !ctx.llmGenerationConfig?.input.trim() ||
            !ctx.llmGenerationConfig?.selectedGenerationModel ||
            ctx.isInProgress
          }
          className="w-full"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {ctx.llmGenerationConfig?.isGenerating
            ? "Generating..."
            : "Generate Prompt"}
        </Button>
      </div>
    </div>
  );
}
