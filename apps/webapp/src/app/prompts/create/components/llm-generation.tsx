"use client";

import type React from "react";

import ModelSelect, { type ModelSelectValue } from "@/components/model-select";
import { type LLMGenerationConfig, usePageContext } from "../context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MCQGenerator,
  OpenEndedGenerator,
  type Prompt,
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
    <section className="rounded-xl border border-border bg-card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">4. Generation</h2>

      <div className="space-y-5">
        <div className="space-y-3">
          <label className="text-base font-medium text-foreground">
            Generation Model
          </label>
          <p className="text-sm text-muted-foreground">
            The LLM model used to generate the Prompts.
          </p>
          <ModelSelect
            value={ctx.llmGenerationConfig?.selectedGenerationModel ?? null}
            options={ctx.modelSelectOptions}
            isLoading={isAnyProviderLoading(ctx.providers)}
            isMulti={false}
            onModelSelected={handleModelSelected}
            disabled={ctx.isInProgress}
          />
        </div>

        <div className="space-y-3">
          <label className="text-base font-medium text-foreground">
            Instructions
          </label>
          <Textarea
            value={ctx.llmGenerationConfig?.instructions}
            onChange={handleInstructionsChange}
            disabled={ctx.isInProgress}
            className="resize-none text-base"
            rows={4}
            placeholder="Enter instructions for how the question should be generated..."
          />
        </div>

        <div className="space-y-3">
          <label className="text-base font-medium text-foreground">
            Input Text
          </label>
          <Textarea
            value={ctx.llmGenerationConfig?.input}
            onChange={handleInputChange}
            disabled={ctx.isInProgress}
            className="resize-none text-base"
            rows={4}
            placeholder="Enter the source text to generate questions from..."
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
          className="w-full h-12 text-base"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {ctx.llmGenerationConfig?.isGenerating
            ? "Generating..."
            : "Generate Prompt"}
        </Button>
      </div>
    </section>
  );
}
