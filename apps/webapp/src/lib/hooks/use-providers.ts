import { useMemo } from "react";
import { useOpenRouterProvider } from "./use-openrouter-provider";
import { useGoogleProvider } from "./use-google-provider";
import { useOpenAIProvider } from "./use-openai-provider";

export function useProviders() {
  const openrouterProvider = useOpenRouterProvider();
  const googleProvider = useGoogleProvider();
  const openaiProvider = useOpenAIProvider();

  return useMemo(
    () => ({
      [openrouterProvider.identifier]: {
        ...openrouterProvider,
        icon: "/openrouter.svg",
      },
      [googleProvider.identifier]: {
        ...googleProvider,
        icon: "/gemini.svg",
      },
      [openaiProvider.identifier]: {
        ...openaiProvider,
        icon: "/openai.svg",
      },
    }),
    [openrouterProvider, googleProvider, openaiProvider]
  );
}
