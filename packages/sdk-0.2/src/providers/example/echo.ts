import {
  AbstractLLMProvider,
  ChatResponse,
  LLMProviderForwardArgs,
} from "../abstract/llm";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources/shared";

function getLastUserMessage(messages: ChatCompletionMessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.role === "user" && typeof msg.content === "string") {
      return msg.content;
    }
  }
  return "";
}

function toResponseText(
  prompt: string,
  responseFormat?:
    | ResponseFormatText
    | ResponseFormatJSONSchema
    | ResponseFormatJSONObject
) {
  if (!responseFormat || responseFormat.type === "text") {
    return prompt;
  }

  // Very small example: when the caller requests JSON, return a JSON string.
  return JSON.stringify({ echo: prompt });
}

/**
 * Example provider implementation for local testing and as a reference.
 *
 * - Extends `AbstractLLMProvider`
 * - Implements `forward({ messages, model, ... })`
 * - Does not perform any network calls
 */
export class ExampleEchoLLMProvider extends AbstractLLMProvider {
  override readonly kind = "example.echo";

  override async forward(args: LLMProviderForwardArgs): Promise<ChatResponse> {
    const startedAt = Date.now();
    const prompt = getLastUserMessage(args.messages);
    const data = toResponseText(prompt, args.responseFormat);

    return {
      data,
      startedAt,
      completedAt: Date.now(),
    };
  }
}
