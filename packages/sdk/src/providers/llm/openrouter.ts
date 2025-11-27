import {
  BaseLLMProvider,
  BaseLLMProviderForwardOptions,
  BaseLLMProviderOptions,
  ForwardResponse,
  LargeLanguageModel,
  LargeLanguageModelOwner,
  LargeLanguageModelOwnerType,
  LargeLanguageModelType,
  ModelInfo,
} from "@/providers/llm/base-llm-provider";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import axios from "axios";
import OpenAI from "openai";
import Decimal from "decimal.js";

const baseURL = "https://openrouter.ai/api/v1";
const MODELS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export class OpenRouterProvider extends BaseLLMProvider {
  private models: ModelsResponse | undefined = undefined;
  private modelsCachePromise: Promise<ModelsResponse | undefined> =
    Promise.resolve(undefined);
  private modelsUpdatedAt = 0;

  readonly identifier = "openrouter.ai";

  constructor(options: OpenRouterProviderOptions) {
    super({
      ...options,
      baseURL,
    });
  }

  /**
   * Updates the cache that holds information about OpenRouter models
   * including pricing information. It will be valid for 24 hours as
   * long as the instance of this Provider object is alive.
   */
  private async updateModelsCache() {
    // Chain each update method call to the promise.
    // This approach prevents race conditions between multiple calls.
    // Since each call is chained to the end of the previous one,
    // each promise makes a request only if the models cache is not updated
    // in the last call. Otherwise it simply resolves to the cached value.
    this.modelsCachePromise = this.modelsCachePromise
      .then(async () => {
        if (
          // The data presented in the cache
          this.models !== undefined &&
          // The cache is still valid
          Date.now() - this.modelsUpdatedAt < MODELS_CACHE_TTL
        ) {
          return this.models;
        }

        // If the cache is not valid, update it
        return axios
          .get<ModelsResponse>(`${baseURL}/models`)
          .then((res) => res.data)
          .then((data) => {
            // Only get the models that supports text input and output
            data = {
              data: data.data.filter(
                (m) =>
                  m.architecture.input_modalities.includes("text") &&
                  m.architecture.output_modalities.includes("text") &&
                  // These models are "fast apply model" and don't support multi turn conversations so don't include them
                  ![
                    "morph/morph-v3-large",
                    "morph/morph-v3-fast",
                    "relace/relace-apply-3",
                  ].includes(m.id)
              ),
            };

            this.models = data;
            this.modelsUpdatedAt = Date.now();

            return data;
          });
      })
      .catch(() => undefined);

    // Wait for the promise chain to resolve
    await this.modelsCachePromise;
  }

  /**
   * Returns the detailed information about
   * the models that are available on OpenRouter.
   */
  async getModelDetails(): Promise<ModelsResponse["data"] | undefined>;
  async getModelDetails(
    modelId: string
  ): Promise<ModelsResponse["data"][number] | undefined>;
  async getModelDetails(modelId?: string) {
    await this.updateModelsCache();

    if (modelId === undefined) {
      return this.models?.data;
    }

    return this.models?.data.find((model) => model.id === modelId);
  }

  /**
   * Returns the credits that the account has on openrouter.ai
   */
  async getCredits() {
    const response = await axios.get(`${baseURL}/credits`, {
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });
    return response.data;
  }

  /**
   * Makes a request to a protected endpoint to validate the API key.
   */
  async validateApiKey() {
    await axios.get(`${baseURL}/models/user`, {
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    // If the request is successful, the API key is valid
    return true;
  }

  async forward(
    input: string | ChatCompletionMessageParam[],
    options: BaseLLMProviderForwardOptions
  ): Promise<ForwardResponse> {
    // Extend `forward()` method to include cost information

    const [response] = await Promise.all([
      super.forward(input, options),
      this.updateModelsCache(), // Concurrently update the cache for cost info
    ]);

    // Get the model info from the cache
    const modelInfo = this.models?.data.find(
      (model) => model.id === options.model
    );
    let inputCost: string | undefined = undefined;
    let outputCost: string | undefined = undefined;

    if (modelInfo !== undefined) {
      // Use Decimal.js for more accurate calculation
      if (response.inputTokensUsed !== undefined) {
        inputCost = new Decimal(modelInfo.pricing.prompt)
          .mul(response.inputTokensUsed)
          .toFixed(10);
      }
      if (response.outputTokensUsed !== undefined) {
        outputCost = new Decimal(modelInfo.pricing.completion)
          .mul(response.outputTokensUsed)
          .toFixed(10);
      }
    }

    return {
      ...response,
      inputCost,
      outputCost,
    };
  }

  parseModelInfo(
    modelOrId: OpenAI.Models.Model | string
  ): ModelInfo | undefined {
    const id = typeof modelOrId === "string" ? modelOrId : modelOrId.id;
    const [, modelName] = id.split("/");

    if (!modelName) {
      return;
    }

    let name: LargeLanguageModelType;
    let owner: LargeLanguageModelOwnerType;

    switch (modelName) {
      case "ministral-8b":
        owner = LargeLanguageModelOwner.Mistral;
        name = LargeLanguageModel[owner].Ministral_8B;
        break;
      case "chatgpt-4o-latest":
        owner = LargeLanguageModelOwner.OpenAI;
        name = LargeLanguageModel[owner].ChatGPT_4o;
        break;
      case "gpt-4o-mini":
        owner = LargeLanguageModelOwner.OpenAI;
        name = LargeLanguageModel[owner].GPT_4o_Mini;
        break;
      case "deepseek-chat-v3-0324":
        owner = LargeLanguageModelOwner.Deepseek;
        name = LargeLanguageModel[owner].V3_0324;
        break;
      case "gpt-4o":
        owner = LargeLanguageModelOwner.OpenAI;
        name = LargeLanguageModel[owner].GPT_4o;
        break;
      case "gpt-5":
        owner = LargeLanguageModelOwner.OpenAI;
        name = LargeLanguageModel[owner].GPT_5;
        break;
      case "claude-3.7-sonnet":
        owner = LargeLanguageModelOwner.Anthropic;
        name = LargeLanguageModel[owner].Claude_3_7_Sonnet;
        break;
      case "claude-sonnet-4.5":
        owner = LargeLanguageModelOwner.Anthropic;
        name = LargeLanguageModel[owner].Claude_Sonnet_4_5;
        break;
      case "llama-3.3-70b-instruct":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_3_3_70b_Instruct;
        break;
      case "llama-3.1-70b-instruct":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_3_1_70b_Instruct;
        break;
      case "llama-3.1-8b-instruct":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_3_1_8b_Instruct;
        break;
      case "deepseek-chat":
        owner = LargeLanguageModelOwner.Deepseek;
        name = LargeLanguageModel[owner].V3;
        break;
      case "qwq-32b":
        owner = LargeLanguageModelOwner.Qwen;
        name = LargeLanguageModel[owner].QwQ_32b;
        break;
      case "gemini-2.0-flash-001":
        owner = LargeLanguageModelOwner.Google;
        name = LargeLanguageModel[owner].Gemini_2_0_Flash;
        break;
      case "gemini-2.0-flash-lite-001":
        owner = LargeLanguageModelOwner.Google;
        name = LargeLanguageModel[owner].Gemini_2_0_Flash_Lite;
        break;
      case "gemini-2.5-flash-lite":
        owner = LargeLanguageModelOwner.Google;
        name = LargeLanguageModel[owner].Gemini_2_5_Flash_Lite;
        break;
      case "gemini-2.5-pro":
        owner = LargeLanguageModelOwner.Google;
        name = LargeLanguageModel[owner].Gemini_2_5_Pro;
        break;
      case "grok-3-beta":
      case "grok-3":
        owner = LargeLanguageModelOwner.XAI;
        name = LargeLanguageModel[owner].Grok3_Beta;
        break;
      case "grok-4":
        owner = LargeLanguageModelOwner.XAI;
        name = LargeLanguageModel[owner].Grok4;
        break;
      case "llama-4-maverick":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_4_Maverick;
        break;
      case "llama-4-scout":
        owner = LargeLanguageModelOwner.Meta;
        name = LargeLanguageModel[owner].Llama_4_Scout;
        break;
      default:
        return;
    }

    return {
      id,
      name,
      owner,
      provider: this.identifier.toLowerCase(),
    };
  }
}

export type OpenRouterProviderOptions = Omit<BaseLLMProviderOptions, "baseURL">;

type PutModality = "text" | "image" | "file" | "audio";
type Modality = "text->text" | "text+image->text" | "text+image->text+image";
type ModelsResponse = {
  data: {
    readonly id: string;
    readonly canonical_slug: string;
    readonly hugging_face_id: null | string;
    readonly name: string;
    readonly created: number;
    readonly description: string;
    readonly context_length: number;
    readonly architecture: {
      readonly modality: Modality;
      readonly input_modalities: PutModality[];
      readonly output_modalities: PutModality[];
      readonly instruct_type: null | string;
    };
    readonly pricing: {
      readonly prompt: string;
      readonly completion: string;
      readonly request?: string;
      readonly image?: string;
      readonly web_search?: string;
      readonly internal_reasoning?: string;
      readonly input_cache_read?: string;
      readonly input_cache_write?: string;
      readonly audio?: string;
    };
  }[];
};
