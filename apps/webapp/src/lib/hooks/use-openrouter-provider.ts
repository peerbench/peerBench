import { OpenRouterProvider } from "peerbench";
import {
  LLMProviderInstantiateFunction,
  useLLMProvider,
} from "./use-llm-provider";
import { useSettingOpenRouterKey } from "./settings/use-setting-openrouter-key";
import { useCallback } from "react";
import Decimal from "decimal.js";

export const useOpenRouterProvider = () => {
  // TODO: Should we listen for API change across all the tabs? This may cause to interrupt an ongoing request and fail benchmark sessions etc.
  const [apiKey] = useSettingOpenRouterKey(false);
  const instantiate = useCallback<LLMProviderInstantiateFunction>(async () => {
    // Rendering in progress and we could not get the API key from localStorage yet
    if (apiKey === undefined) return;

    const instance = new OpenRouterProvider({ apiKey: apiKey });

    // Check whether the API key is valid
    await instance.validateApiKey().catch((err) => {
      throw new Error(`OpenRouter API key is not valid.`, {
        cause: err,
      });
    });

    return [
      instance,

      // Get model list from the OpenRouter API
      await instance.getModelDetails().then(
        (models) =>
          models?.map((model) => ({
            modelId: model.id,
            perMillionTokenInputCost: new Decimal(model.pricing.prompt)
              .mul(1000000)
              .toFixed(10),
            perMillionTokenOutputCost: new Decimal(model.pricing.completion)
              .mul(1000000)
              .toFixed(10),
          })) ?? []
      ),
    ];
  }, [apiKey]);

  return useLLMProvider({
    identifier: OpenRouterProvider.identifier,
    label: "OpenRouter",
    instantiate,
  });
};
