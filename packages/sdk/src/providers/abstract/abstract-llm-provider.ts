import { AbstractProvider } from "@/providers/abstract/abstract-provider";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  ResponseFormatJSONSchema,
  ResponseFormatJSONObject,
  ResponseFormatText,
} from "openai/resources/shared";
import { RateLimiter } from "@/utils";

export abstract class AbstractLLMProvider extends AbstractProvider<
  string,
  string
> {
  /**
   * Fetch all supported models from the provider.
   * @returns Array of models supported by the provider
   */
  abstract getModels(): Promise<LLMModel[]>;

  /**
   * Forwards the given input to the target model
   * @param input
   * @param options
   */
  abstract forward(
    input: string | ChatCompletionMessageParam[],
    options: LLMProviderForwardOptions
  ): Promise<ForwardResponse>;
}

/**
 * Response collected from a forwarded request.
 */
export type ForwardResponse = {
  data: string;
  startedAt: Date;
  completedAt: Date;

  inputTokensUsed?: number;
  inputCost?: string;

  outputTokensUsed?: number;
  outputCost?: string;
};

/**
 * An LLM model supported by the provider.
 */
export type LLMModel = {
  /**
   * Piece of string that is being used in the forward requests to identify the model.
   */
  slug: string;
  owner?: string;
  perMillionTokenInputCost?: string;
  perMillionTokenOutputCost?: string;
  releaseDate?: string | Date;
  contextWindow?: number;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type LLMProviderForwardOptions = {
  rateLimiter?: RateLimiter;
  model: string;
  system?: string;
  abortSignal?: AbortSignal;
  temperature?: number;
  responseFormat?:
    | ResponseFormatText
    | ResponseFormatJSONSchema
    | ResponseFormatJSONObject;
};
