import { useMemo } from "react";
import { useOpenRouterProvider } from "./use-openrouter-provider";
import { useGoogleProvider } from "./use-google-provider";

export function useProviders() {
  const openrouterProvider = useOpenRouterProvider();
  const googleProvider = useGoogleProvider();

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
    }),
    [openrouterProvider, googleProvider]
  );
}
