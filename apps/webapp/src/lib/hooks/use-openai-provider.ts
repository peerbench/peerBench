import { OpenAILLMProvider } from "peerbench";
import {
  LLMProviderInstantiateFunction,
  useLLMProvider,
} from "./use-llm-provider";
import { useSettingOpenAIKey } from "./settings/use-setting-openai-key";
import { useCallback } from "react";

export const useOpenAIProvider = () => {
  const [apiKey] = useSettingOpenAIKey(false);
  const instantiate = useCallback<LLMProviderInstantiateFunction>(async () => {
    // Rendering in progress and we could not get the API key from localStorage yet
    if (apiKey === undefined) return;

    const instance = new OpenAILLMProvider({ apiKey: apiKey });
    const models = await instance.getModels().catch((err) => {
      throw new Error(`OpenAI API key is not valid.`, { cause: err });
    });

    return [instance, models.map((m) => ({ modelId: m.slug }))];
  }, [apiKey]);

  return useLLMProvider({
    identifier: OpenAILLMProvider.identifier,
    label: "OpenAI",
    instantiate,
  });
};
