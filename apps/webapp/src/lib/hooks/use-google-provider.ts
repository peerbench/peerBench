import { GoogleLLMProvider } from "peerbench";
import {
  LLMProviderInstantiateFunction,
  useLLMProvider,
} from "./use-llm-provider";
import { useSettingGoogleKey } from "./settings/use-setting-google-key";
import { useCallback } from "react";

export const useGoogleProvider = () => {
  const [apiKey] = useSettingGoogleKey(false);
  const instantiate = useCallback<LLMProviderInstantiateFunction>(async () => {
    // Rendering in progress and we could not get the API key from localStorage yet
    if (apiKey === undefined) return;

    const instance = new GoogleLLMProvider({ apiKey: apiKey });
    const models = await instance.getModels().catch((err) => {
      throw new Error(`Google API key is not valid.`, { cause: err });
    });

    return [instance, models.map((m) => ({ modelId: m.slug }))];
  }, [apiKey]);

  return useLLMProvider({
    identifier: GoogleLLMProvider.identifier,
    label: "Google",
    instantiate,
  });
};
