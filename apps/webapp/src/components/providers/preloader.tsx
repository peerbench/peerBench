"use client";

import { useInfinitePromptSets } from "@/lib/react-query/use-infinite-prompt-sets";
import { useInfinitePrompts } from "@/lib/react-query/use-infinite-prompts";
import { useProfile } from "@/lib/react-query/use-profile";
import { createContext, ReactNode } from "react";

/**
 * A Provider to trigger fetching data in the background.
 */

export type PreloaderContextType = Record<string, never>;

export function PreloaderContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Load Prompt Sets
  useInfinitePromptSets();

  // Load Prompt list
  useInfinitePrompts();

  // Load profile
  useProfile();

  return (
    <PreloaderContext.Provider value={{}}>{children}</PreloaderContext.Provider>
  );
}

export const PreloaderContext = createContext<PreloaderContextType | null>(
  null
);
