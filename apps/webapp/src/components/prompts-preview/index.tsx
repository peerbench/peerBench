"use client";

import { Prompt } from "peerbench";
import { EntityPreview } from "../entity-preview";
import { Content } from "./content";

export type PromptsPreviewProps<TPrompt extends Prompt> = {
  prompts: TPrompt[];
  showCorrectAnswer?: boolean;
  isLoading?: boolean;
  collapsible?: boolean;
  renderHeader?: (item: TPrompt, index: number) => React.ReactNode;
  renderFooter?: (item: TPrompt, index: number) => React.ReactNode;
};

export default function PromptsPreview<TPrompt extends Prompt>({
  prompts,
  showCorrectAnswer = true,
  isLoading = false,
  collapsible = true,
  renderHeader,
  renderFooter,
}: PromptsPreviewProps<TPrompt>) {
  return (
    <EntityPreview
      items={prompts}
      title="Prompts Preview"
      itemName="prompts"
      isLoading={isLoading}
      collapsible={collapsible}
      contentProps={{ showCorrectAnswer }}
      renderHeader={renderHeader}
      renderFooter={renderFooter}
      renderContent={({
        isLoading,
        items,
        currentIndex,
        onPrevious,
        onNext,
        showCorrectAnswer,
      }) => (
        <Content
          isLoading={isLoading}
          prompts={items as Prompt[]}
          currentIndex={currentIndex}
          showCorrectAnswer={showCorrectAnswer}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
    />
  );
}
