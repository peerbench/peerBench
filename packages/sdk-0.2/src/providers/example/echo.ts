import { AbstractProvider } from "../abstract";
import {
  type CallableLLM,
  type LLMResponse,
  type CallableLLMForwardArgs,
} from "../callables/llm";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources/shared";

export class ExampleEchoLLMProvider extends AbstractProvider.withKind(
  "example.echo"
) {
  model(config?: { model?: string }): CallableLLM<ExampleEchoLLMProvider> {
    const slug = config?.model ?? "echo";

    return {
      slug,
      provider: this,
      forward: async (args: CallableLLMForwardArgs): Promise<LLMResponse> => {
        const startedAt = Date.now();
        const prompt = getLastUserMessage(args.messages);
        const data = toResponseText(prompt, args.responseFormat);

        return { data, startedAt, completedAt: Date.now() };
      },
    };
  }
}

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

  return JSON.stringify({ echo: prompt });
}
