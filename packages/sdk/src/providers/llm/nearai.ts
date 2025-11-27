import {
  BaseLLMProvider,
  BaseLLMProviderOptions,
  LargeLanguageModel,
  LargeLanguageModelOwner,
  LargeLanguageModelOwnerType,
  LargeLanguageModelType,
  ModelInfo,
} from "@/providers/llm/base-llm-provider";
import OpenAI from "openai";

export class NearAIProvider extends BaseLLMProvider {
  readonly identifier = "near.ai";

  constructor(options: NearAIProviderOptions) {
    super({
      ...options,
      baseURL: "https://api.near.ai/v1",
    });
  }

  parseModelInfo(
    modelOrId: OpenAI.Models.Model | string
  ): ModelInfo | undefined {
    const id = typeof modelOrId === "string" ? modelOrId : modelOrId.id;
    let modelName: string | undefined;
    let host: string | undefined;

    if (id.startsWith("fireworks::")) {
      const splitResult = id.split("/");
      modelName = splitResult.pop();
      host = "fireworks";
    } else if (id.startsWith("hyperbolic::")) {
      const splitResult = id.split("/");
      modelName = splitResult.pop();
      host = "hyperbolic";
    }

    if (!modelName) {
      return;
    }

    let name: LargeLanguageModelType;
    let owner: LargeLanguageModelOwnerType;

    switch (modelName) {
      case "llama4-maverick-instruct-basic":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_4_Maverick;
        break;
      case "llama4-scout-instruct-basic":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_4_Scout;
        break;
      case "llama-v3p3-70b-instruct":
      case "Llama-3.3-70B-Instruct":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_3_3_70b_Instruct;
        break;
      case "llama-v3p1-8b-instruct":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_3_1_8b_Instruct;
        break;
      case "deepseek-v3":
      case "DeepSeek-V3":
        owner = LargeLanguageModelOwner.Deepseek;
        name = LargeLanguageModel[owner].V3;
        break;
      case "qwq-32b":
        owner = LargeLanguageModelOwner.Qwen;
        name = LargeLanguageModel[owner].QwQ_32b;
        break;
      default:
        return;
    }

    return {
      id,
      name,
      owner,
      host,
      provider: this.identifier.toLowerCase(),
    };
  }
}

export type NearAIProviderOptions = Omit<BaseLLMProviderOptions, "baseURL">;
