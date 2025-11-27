import { useMemo } from "react";
// import { useNearAIProvider } from "./use-nearai-provider";
import { useOpenRouterProvider } from "./use-openrouter-provider";

export function useProviders() {
  const openrouterProvider = useOpenRouterProvider();
  // const nearaiProvider = useNearAIProvider();

  return useMemo(
    () => ({
      [openrouterProvider.identifier]: {
        ...openrouterProvider,
        icon: "/openrouter.svg",
      },
      // [nearaiProvider.identifier]: {
      //   ...nearaiProvider,
      //   icon: "/nearai.png",
      // },
    }),
    [openrouterProvider /* nearaiProvider */]
  );
}
