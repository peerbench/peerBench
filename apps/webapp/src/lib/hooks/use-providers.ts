import { useMemo } from "react";
import { useOpenRouterProvider } from "./use-openrouter-provider";

export function useProviders() {
  const openrouterProvider = useOpenRouterProvider();

  return useMemo(
    () => ({
      [openrouterProvider.identifier]: {
        ...openrouterProvider,
        icon: "/openrouter.svg",
      },
    }),
    [openrouterProvider]
  );
}
