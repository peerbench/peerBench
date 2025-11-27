"use client";

import { ApiKeyProvider, ApiKeyProviders } from "@/database/types";
import { useSettingOpenRouterKey } from "@/lib/hooks/settings/use-setting-openrouter-key";
import { useEffect } from "react";

// Dummy component to update the API key stored in the local storage.
// This is useful when a "server" component needs to do that.

export type OpenRouterApiKeySetterProps = {
  apiKey?: string;
  provider?: ApiKeyProvider;
};

export function OpenRouterApiKeySetter({
  apiKey,
  provider,
}: OpenRouterApiKeySetterProps) {
  const [openRouterApiKey, setOpenRouterApiKey] = useSettingOpenRouterKey();

  useEffect(() => {
    if (apiKey !== undefined && provider !== undefined) {
      if (provider === ApiKeyProviders.openrouter) {
        if (openRouterApiKey === undefined) {
          setOpenRouterApiKey(apiKey);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRouterApiKey, apiKey, provider]);

  return null;
}
