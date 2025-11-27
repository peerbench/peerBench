"use client";

import { PromptResponse } from "peerbench";
import { EntityPreview } from "../entity-preview";
import { Content } from "./content";

export type ResponsesPreviewProps<T extends PromptResponse = PromptResponse> = {
  responses: T[];
  isLoading?: boolean;
  collapsible?: boolean;
  renderHeader?: (item: T, index: number) => React.ReactNode;
  renderFooter?: (item: T, index: number) => React.ReactNode;
};

export function ResponsesPreview<T extends PromptResponse = PromptResponse>({
  responses,
  isLoading = false,
  collapsible = true,
  renderHeader,
  renderFooter,
}: ResponsesPreviewProps<T>) {
  return (
    <EntityPreview
      items={responses}
      title="Responses Preview"
      itemName="responses"
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
          responses={items as T[]}
          currentIndex={currentIndex}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
    />
  );
}
