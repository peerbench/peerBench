import { ChatResponse } from "./abstract/llm";
import { RateLimiter } from "@/utils";
import { OpenAIProvider } from "./openai";
import { ChatCompletionMessageParam } from "openai/resources/index";
import {
  ResponseFormatText,
  ResponseFormatJSONSchema,
  ResponseFormatJSONObject,
} from "openai/resources/shared";
import axios from "axios";
import Decimal from "decimal.js";

const baseURL = "https://openrouter.ai/api/v1";
const MODELS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export class OpenRouterProvider extends OpenAIProvider {
  private models: ModelsResponse | undefined = undefined;
  private modelsCachePromise: Promise<ModelsResponse | undefined> =
    Promise.resolve(undefined);
  private modelsUpdatedAt = 0;

  constructor(config: {
    apiKey: string;
    maxRetries?: number;
    timeout?: number;
    rateLimiter?: RateLimiter;
  }) {
    super({
      baseURL,
      apiKey: config.apiKey,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
      rateLimiter: config.rateLimiter,
    });
  }

  override async forward(args: {
    messages: ChatCompletionMessageParam[];
    model: string;
    abortSignal?: AbortSignal;
    temperature?: number;
    responseFormat?:
      | ResponseFormatText
      | ResponseFormatJSONSchema
      | ResponseFormatJSONObject;
  }): Promise<ChatResponse> {
    // Update models cache concurrently (non-blocking)
    const [response] = await Promise.all([
      super.forward(args),
      this.updateModelsCache().catch(() => {
        // Silently fail if cache update fails
      }),
    ]);

    // Get the model info from the cache
    const modelInfo = this.models?.data.find((m) => m.id === args.model);
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
}

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
