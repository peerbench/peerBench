import { AbstractProvider, ProviderResponse } from "./provider";
import {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources/shared";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export abstract class AbstractLLMProvider extends AbstractProvider {
  abstract forward(args: LLMProviderForwardArgs): Promise<ChatResponse>;
}

export type LLMProviderForwardArgs = {
  messages: ChatCompletionMessageParam[];
  model: string;
  abortSignal?: AbortSignal;
  temperature?: number;
  responseFormat?:
    | ResponseFormatText
    | ResponseFormatJSONSchema
    | ResponseFormatJSONObject;
};

export type ChatResponse = ProviderResponse<string> & {
  inputTokensUsed?: number;
  outputTokensUsed?: number;
  inputCost?: string;
  outputCost?: string;
};
