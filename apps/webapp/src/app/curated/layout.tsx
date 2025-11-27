"use client";

import { PromptSearchFiltersContextProvider } from "@/components/prompt-search-filters/context";
import { ComponentContextProvider } from "@/components/prompts-infinite-list/context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PromptSearchFiltersContextProvider>
      <ComponentContextProvider>{children}</ComponentContextProvider>
    </PromptSearchFiltersContextProvider>
  );
}
