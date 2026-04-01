import {
  AbstractProvider,
  PEERBENCH_NAMESPACE,
  type CallableLLM,
  type LLMResponse,
  type CallableLLMForwardArgs,
} from "@peerbench/core";
import { RateLimiter } from "@/utils/rate-limiter";
import { OpenAIProvider } from "../openai/provider";
import Decimal from "decimal.js";
import axios from "axios";

const baseURL = "https://openrouter.ai/api/v1";
const MODELS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export class OpenRouterProvider extends AbstractProvider.withKind(
  `${PEERBENCH_NAMESPACE}/llm/openrouter.ai`,
) {
  private models: ModelsResponse | undefined = undefined;
  private modelsCachePromise: Promise<ModelsResponse | undefined> =
    Promise.resolve(undefined);
  private modelsUpdatedAt = 0;
  private openAIProvider: OpenAIProvider;

  constructor(config: {
    apiKey: string;
    maxRetries?: number;
    timeout?: number;
    rateLimiter?: RateLimiter;
  }) {
    super();
    this.openAIProvider = new OpenAIProvider({
      baseURL,
      apiKey: config.apiKey,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
      rateLimiter: config.rateLimiter,
    });
  }

  model(config: { model: string }): CallableLLM<OpenRouterProvider> {
    const openAICallable = this.openAIProvider.model({ model: config.model });
    this.updateModelsCache().catch(() => {});

    return {
      slug: config.model,
      provider: this,
      forward: async (
        args: CallableLLMForwardArgs,
      ): Promise<LLMResponse> => {
        const response = await openAICallable.forward(args);

        const modelInfo = this.models?.data.find(
          (m) => m.id === config.model,
        );
        let inputCost: string | undefined = undefined;
        let outputCost: string | undefined = undefined;

        if (modelInfo !== undefined) {
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

        return { ...response, inputCost, outputCost };
      },
    };
  }

  private async updateModelsCache() {
    this.modelsCachePromise = this.modelsCachePromise
      .then(async () => {
        if (
          this.models !== undefined &&
          Date.now() - this.modelsUpdatedAt < MODELS_CACHE_TTL
        ) {
          return this.models;
        }

        return axios
          .get<ModelsResponse>(`${baseURL}/models`)
          .then((res) => res.data)
          .then((data) => {
            data = {
              data: data.data.filter(
                (m) =>
                  m.architecture.input_modalities.includes("text") &&
                  m.architecture.output_modalities.includes("text") &&
                  ![
                    "morph/morph-v3-large",
                    "morph/morph-v3-fast",
                    "relace/relace-apply-3",
                  ].includes(m.id),
              ),
            };

            this.models = data;
            this.modelsUpdatedAt = Date.now();
            return data;
          });
      })
      .catch(() => undefined);

    await this.modelsCachePromise;
  }
}

type PutModality = "text" | "image" | "file" | "audio";
type Modality = "text->text" | "text+image->text" | "text+image->text+image";

type ModelInfo = {
  readonly id: string;
  readonly name: string;
  readonly created: number;
  readonly context_length: number;
  readonly architecture: {
    readonly modality: Modality;
    readonly input_modalities: PutModality[];
    readonly output_modalities: PutModality[];
  };
  readonly pricing: {
    readonly prompt: string;
    readonly completion: string;
  };
};

type ModelsResponse = {
  data: ModelInfo[];
};
