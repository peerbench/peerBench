"use client";

import { EntityPreview } from "../entity-preview";
import { Content } from "./content";
import { PromptScoreState } from "@/app/upload/context";

export type ScoresPreviewProps = {
  scores: PromptScoreState[];
  isLoading?: boolean;
  collapsible?: boolean;
  renderHeader?: (item: PromptScoreState, index: number) => React.ReactNode;
  renderFooter?: (item: PromptScoreState, index: number) => React.ReactNode;
};

export default function ScoresPreview({
  scores,
  isLoading = false,
  collapsible = true,
  renderHeader,
  renderFooter,
}: ScoresPreviewProps) {
  return (
    <EntityPreview
      items={scores}
      title="Scores Preview"
      itemName="scores"
      isLoading={isLoading}
      collapsible={collapsible}
      renderHeader={renderHeader}
      renderFooter={renderFooter}
      renderContent={({
        isLoading,
        items,
        currentIndex,
        onPrevious,
        onNext,
      }) => (
        <Content
          isLoading={isLoading}
          scores={items as PromptScoreState[]}
          currentIndex={currentIndex}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
    />
  );
}
