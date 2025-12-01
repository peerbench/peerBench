"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { usePageContext } from "../context";
import { preparePrompt, PromptTypes } from "peerbench";
import { Button } from "@/components/ui/button";
import Alert from "@/components/ui/alert";
import OptionInput from "./option-input";
import DocumentSelector from "@/components/document-selector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, AlertTriangle } from "lucide-react";

export default function PromptInformation() {
  const ctx = usePageContext();

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    ctx.setPrompt((prev) => {
      let fullPromptData = preparePrompt(e.target.value, prev.options);

      // If this is an "Open Ended with Docs" prompt and documents are selected, append them
      if (
        ctx.selectedPromptType === PromptTypes.OpenEndedWithDocs &&
        ctx.selectedDocuments.length > 0
      ) {
        const documentSections = ctx.selectedDocuments
          .map(
            (doc) =>
              `<supporting-document name="${doc.name}">\n${doc.content}\n</supporting-document>\n\n`
          )
          .join("");
        fullPromptData += "\n\n" + documentSections;
      }

      return {
        ...prev,
        prompt: e.target.value,
        fullPrompt: fullPromptData,
        // These will be calculated later
        promptCID: "",
        promptSHA256: "",
        fullPromptCID: "",
        fullPromptSHA256: "",
      };
    });
  };

  const handleExpectedAnswerChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    ctx.setPrompt((prev) => ({
      ...prev,
      answer: e.target.value,
    }));
  };

  const handleAddOptionClick = () => {
    const optionKey = String.fromCharCode(
      65 + Object.keys(ctx.prompt.options ?? {}).length
    );
    ctx.setPrompt((prev) => {
      const options = {
        ...prev.options,
        [optionKey]: "",
      };

      return {
        ...prev,
        fullPrompt: preparePrompt(prev.prompt, options),
        // These will be calculated later
        fullPromptCID: "",
        fullPromptSHA256: "",
        options,
      };
    });
  };

  const handleRemoveOptionClick = (optionKey: string) => {
    ctx.setPrompt((prev) => {
      const entries = Object.entries(prev.options ?? {}).sort((a, b) =>
        a[0].localeCompare(b[0])
      );
      let index = 0;

      const newOptions: Record<string, string> = {};
      for (const [key, value] of entries) {
        if (key === optionKey) {
          continue;
        }

        newOptions[String.fromCharCode(65 + index)] = value;
        index++;
      }

      return {
        ...prev,
        options: newOptions,
        answerKey: prev.answerKey === optionKey ? "" : prev.answerKey,
        fullPrompt: preparePrompt(prev.prompt, newOptions),
        fullPromptCID: "",
        fullPromptSHA256: "",
      };
    });
  };

  const handleUpdateOptionClick = (optionKey: string, value: string) => {
    ctx.setPrompt((prev) => {
      const options = {
        ...prev.options,
        [optionKey]: value,
      };

      let fullPromptData = preparePrompt(prev.prompt, options);

      // If this is an "Open Ended with Docs" prompt and documents are selected, append them
      if (
        ctx.selectedPromptType === PromptTypes.OpenEndedWithDocs &&
        ctx.selectedDocuments.length > 0
      ) {
        const documentSections = ctx.selectedDocuments
          .map(
            (doc) =>
              `<supporting-document name="${doc.name}">\n${doc.content}\n</supporting-document>\n\n`
          )
          .join("");
        fullPromptData += "\n\n" + documentSections;
      }

      return {
        ...prev,
        answer: optionKey === prev.answerKey ? options[optionKey] : prev.answer,
        fullPrompt: fullPromptData,
        // These will be calculated later
        fullPromptCID: "",
        fullPromptSHA256: "",
        options,
      };
    });
  };

  const handleAnswerKeyChange = (e: string) => {
    ctx.setPrompt((prev) => ({
      ...prev,
      answerKey: e,
      answer: prev.options?.[e],
    }));
  };

  const handleDocumentsChange = (documents: any[]) => {
    ctx.setSelectedDocuments(documents);

    // Update the full prompt with the new documents
    ctx.setPrompt((prev) => {
      let fullPromptData = preparePrompt(prev.prompt, prev.options);

      // If this is an "Open Ended with Docs" prompt and documents are selected, append them
      if (
        ctx.selectedPromptType === PromptTypes.OpenEndedWithDocs &&
        documents.length > 0
      ) {
        const documentSections = documents
          .map(
            (doc) =>
              `<supporting-document name="${doc.name}">\n${doc.content}\n</supporting-document>\n\n`
          )
          .join("");
        fullPromptData += "\n\n" + documentSections;
      }

      return {
        ...prev,
        fullPrompt: fullPromptData,
        fullPromptCID: "",
        fullPromptSHA256: "",
        // Update metadata to include document information
        metadata: {
          ...prev.metadata,
          supportingDocuments: documents.map((doc) => ({
            id: doc.id,
            name: doc.name,
            cid: doc.cid,
            sha256: doc.sha256,
          })),
        },
      };
    });
  };

  const renderExpectedAnswerAlert = () => {
    if (
      ctx.selectedPromptType !== PromptTypes.MultipleChoice &&
      ctx.prompt.answer &&
      ctx.prompt.answer.length >= 50
    ) {
      return (
        <Alert className="mt-2 border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Keep in mind that long expected answers are hard to evaluate.
          </span>
        </Alert>
      );
    }
  };

  return (
    <section
      id="prompt-creation-section"
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 className="text-lg font-semibold text-foreground mb-6">
        {ctx.generationMode === "llm-generated"
          ? `5. Refinement`
          : `3. Creation`}
      </h2>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-base font-medium text-foreground">
            Question
          </label>
          <Textarea
            value={ctx.prompt.prompt}
            onChange={handleQuestionChange}
            disabled={ctx.isInProgress}
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
            placeholder="Enter your question here..."
          />
          <p className="text-sm text-muted-foreground">
            💡 Ensure the content of the question is aligned with the
            &quot;System Prompt&quot; below, in the &quot;Test Prompt&quot;
            section.
          </p>
        </div>

        {ctx.selectedPromptType === PromptTypes.MultipleChoice ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-base font-medium text-foreground">
                Options
              </label>
              <Button
                onClick={handleAddOptionClick}
                disabled={ctx.isInProgress}
                size="default"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
            {Object.keys(ctx.prompt.options ?? {}).length > 0 ? (
              <p className="text-sm text-muted-foreground">
                💡 Click the letter button next to the correct answer to select
                it
                </p>
            ) : (
              <p className="text-base text-muted-foreground">
                No options available. Add new options via &quot;Add Option&quot;
                button.
              </p>
            )}
            <div className="space-y-3">
              {Object.entries(ctx.prompt.options ?? {}).map(([key, value]) => (
                <OptionInput
                  key={key}
                  optionKey={key}
                  value={value}
                  handleAnswerKeyChange={handleAnswerKeyChange}
                  handleUpdateOptionClick={handleUpdateOptionClick}
                  handleRemoveOptionClick={handleRemoveOptionClick}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-base font-medium text-foreground">
              Expected Answer{" "}
              <span className="font-normal text-muted-foreground">
                (Optional)
              </span>
            </label>
            <Textarea
              value={ctx.prompt.answer}
              onChange={handleExpectedAnswerChange}
              disabled={ctx.isInProgress}
              className="resize-none text-base"
              rows={4}
              placeholder="Enter the expected answer or guidelines..."
            />
            {renderExpectedAnswerAlert()}
          </div>
        )}

        {/* Document Selection for Open Ended with Docs */}
        {ctx.selectedPromptType === PromptTypes.OpenEndedWithDocs && (
          <div className="space-y-3">
            <label className="text-base font-medium text-foreground">
              Supporting Documents
            </label>
            <p className="text-sm text-muted-foreground">
              Select documents to include in the prompt sent to the AI.
            </p>
            <DocumentSelector
              selectedDocuments={ctx.selectedDocuments}
              onDocumentsChange={handleDocumentsChange}
              disabled={ctx.isInProgress}
            />
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem
            value="full-prompt"
            className="border rounded-xl overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 text-base hover:no-underline hover:bg-muted/50">
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium text-foreground">
                  Full Prompt Preview
                </span>
                {ctx.prompt.fullPrompt.length > 0 && (
                  <span className="text-sm text-muted-foreground font-normal">
                    {ctx.prompt.fullPrompt.length} characters
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
 <div className="p-2 border-t bg-gray-50 border-gray-200">             
  <Textarea
                value={ctx.prompt.fullPrompt}
                readOnly
                className="min-h-[200px] max-h-[400px] resize-none font-mono text-sm bg-white"
                placeholder="Full prompt will appear here..."
              />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
