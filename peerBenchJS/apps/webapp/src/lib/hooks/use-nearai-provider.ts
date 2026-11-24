import {
  // LargeLanguageModel,
  // LargeLanguageModelOwner,
  NearAIProvider,
} from "peerbench";
import { useLLMProvider } from "./use-llm-provider";

/**
 * @deprecated Not in use, may include not working code.
 */
export const useNearAIProvider = () => {
  const identifier = new NearAIProvider({ apiKey: "" }).identifier;

  return useLLMProvider({
    // TODO: We should be able to get the identifier without instantiating the provider
    identifier,
    label: "Near AI",
    instantiate: () => {
      const nearAiToken = localStorage.getItem("nearai_auth_token");
      if (!nearAiToken) {
        throw new Error(
          `Near AI API key is not configured. Please set your API key in the settings.`
        );
      }

      return [new NearAIProvider({ apiKey: nearAiToken }), []];
    },
    // defaultModels: [
    //   {
    //     id: "fireworks::accounts/fireworks/models/qwq-32b",
    //     name: LargeLanguageModel[LargeLanguageModelOwner.Qwen].QwQ_32b,
    //     owner: LargeLanguageModelOwner.Qwen,
    //     provider: identifier,
    //     host: "fireworks",
    //   },
    //   {
    //     id: "fireworks::accounts/fireworks/models/deepseek-v3",
    //     name: LargeLanguageModel[LargeLanguageModelOwner.Deepseek].V3,
    //     owner: LargeLanguageModelOwner.Deepseek,
    //     provider: identifier,
    //     host: "fireworks",
    //   },
    //   {
    //     id: "fireworks::accounts/fireworks/models/llama-v3p1-8b-instruct",
    //     name: LargeLanguageModel[LargeLanguageModelOwner.Meta]
    //       .Llama_3_1_8b_Instruct,
    //     owner: LargeLanguageModelOwner.Meta,
    //     provider: identifier,
    //     host: "fireworks",
    //   },
    // ],
  });
};
