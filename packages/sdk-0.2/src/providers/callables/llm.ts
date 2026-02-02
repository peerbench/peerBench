import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources/shared";
import { AbstractProvider, ProviderResponse } from "../abstract";
import { Callable } from "./callable";

export interface CallableLLM<TProvider extends AbstractProvider = AbstractProvider>
  extends Callable<TProvider> {
  slug: string;
  forward(args: CallableLLMForwardArgs): Promise<LLMResponse>;
}

export type CallableLLMForwardArgs = {
  messages: ChatCompletionMessageParam[];
  abortSignal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  responseFormat?:
  | ResponseFormatText
  | ResponseFormatJSONSchema
  | ResponseFormatJSONObject;
};

export type LLMResponse = ProviderResponse<string> & {
  /**
   * Number of input tokens used.
   */
  inputTokensUsed?: number;

  /**
   * Number of output tokens used.
   */
  outputTokensUsed?: number;

  /**
   * Cost of the input tokens.
   */
  inputCost?: string;

  /**
   * Cost of the output tokens.
   */
  outputCost?: string;

  /**
   * Time taken to receive the first token.
   */
  timeToFirstToken?: number;

  metadata?: Record<string, unknown>;
};
