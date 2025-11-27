"use client";

import {
  createContext,
  useContext,
  ReactNode,
  SetStateAction,
  Dispatch,
  useState,
  useMemo,
} from "react";
import { PromptSetSelectOption } from "@/components/prompt-set-select";
import { useProviders } from "@/lib/hooks/use-providers";
import { PromptResponse, PromptScore, Prompt } from "peerbench";

export type CompareModel = {
  provider: string;
  name: string | null;
  host: string;
  owner: string;
  modelId: string;
  elo: number | null;
};

export type ComparisonState = {
  modelA: CompareModel;
  modelB: CompareModel;
  responseA: PromptResponse | null;
  responseB: PromptResponse | null;
  scoreA: PromptScore | null;
  scoreB: PromptScore | null;
  ratingA: number | null; // 1-10 rating
  ratingB: number | null; // 1-10 rating
  isRevealed: boolean; // Whether model names are revealed
  matchId: string | null; // UUID of the saved model match
};

export type PageContextType = {
  userPrompt: string;
  setUserPrompt: Dispatch<SetStateAction<string>>;

  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;

  isSaving: boolean;
  setIsSaving: Dispatch<SetStateAction<boolean>>;

  comparisons: ComparisonState[];
  setComparisons: Dispatch<SetStateAction<ComparisonState[]>>;

  currentComparison: ComparisonState | null;

  selectedPromptSet: PromptSetSelectOption | null;
  setSelectedPromptSet: Dispatch<SetStateAction<PromptSetSelectOption | null>>;

  generatedPrompt: Prompt | null;
  setGeneratedPrompt: Dispatch<SetStateAction<Prompt | null>>;

  providers: ReturnType<typeof useProviders>;

  isDataSaved: boolean;
  setIsDataSaved: Dispatch<SetStateAction<boolean>>;

  userId: Promise<string>;
};

export function PageContextProvider({ children }: { children: ReactNode }) {
  const providers = useProviders();
  const [userPrompt, setUserPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [comparisons, setComparisons] = useState<ComparisonState[]>([]);
  const [selectedPromptSet, setSelectedPromptSet] =
    useState<PromptSetSelectOption | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<Prompt | null>(null);
  const [isDataSaved, setIsDataSaved] = useState(false);

  const currentComparison = useMemo((): ComparisonState | null => {
    if (comparisons.length === 0) return null;
    const lastComparison = comparisons[comparisons.length - 1];
    return lastComparison ?? null;
  }, [comparisons]);

  const userId = useMemo(async () => {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    return user.id;
  }, []);

  return (
    <PageContext.Provider
      value={{
        userPrompt,
        setUserPrompt,

        isGenerating,
        setIsGenerating,

        isSaving,
        setIsSaving,

        comparisons,
        setComparisons,

        currentComparison,

        selectedPromptSet,
        setSelectedPromptSet,

        generatedPrompt,
        setGeneratedPrompt,

        providers,

        isDataSaved,
        setIsDataSaved,

        userId,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

export const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used inside PageContextProvider");
  }
  return context;
}
