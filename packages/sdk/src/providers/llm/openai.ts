import {
  BaseLLMProvider,
  BaseLLMProviderOptions,
} from "@/providers/llm/base-llm-provider";

export class OpenAILLMProvider extends BaseLLMProvider {
  static readonly identifier = "openai";

  constructor(options: OpenAILLMProviderOptions) {
    super(options);
  }
}

export type OpenAILLMProviderOptions = Omit<BaseLLMProviderOptions, "baseURL">;
