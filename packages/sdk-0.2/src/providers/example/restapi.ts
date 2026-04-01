import { AbstractProvider } from "../abstract";
import {
  type LLMResponse,
  type CallableLLM,
  type CallableLLMForwardArgs,
} from "../callables/llm";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

export class ExampleRestApiLLMAgentProvider extends AbstractProvider.withKind(
  "example.rest-api.agent"
) {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly headers?: Record<string, string>;

  constructor(config: ExampleRestApiAgentProviderConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.headers = config.headers;
  }

  model(config?: {
    model?: string;
  }): CallableLLM<ExampleRestApiLLMAgentProvider> {
    const slug = config?.model ?? "default";

    return {
      slug,
      provider: this,
      forward: async (
        args: CallableLLMForwardArgs
      ): Promise<LLMResponse> => {
        const startedAt = Date.now();

        const fetchFn = globalThis.fetch;
        if (!fetchFn) {
          throw new Error(
            "No fetch implementation available. Polyfill `globalThis.fetch` in your host app."
          );
        }

        const url = `${this.baseUrl}/v1/agent/chat`;

        const response = await fetchFn(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.apiKey
              ? { authorization: `Bearer ${this.apiKey}` }
              : {}),
            ...(this.headers ?? {}),
          },
          body: JSON.stringify({
            model: slug,
            temperature: args.temperature,
            messages: args.messages.map(normalizeMessage),
          }),
          signal: args.abortSignal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(
            `REST API provider failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`
          );
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          return {
            data: await response.text(),
            startedAt,
            completedAt: Date.now(),
          };
        }

        const parsedResponse = ExampleRestApiAgentResponseTextSchema.parse(
          await response.json()
        );

        return {
          data: parsedResponse.response,
          startedAt,
          completedAt: Date.now(),
        };
      },
    };
  }
}

type ExampleRestApiAgentProviderConfig = {
  /**
   * Base URL of your REST service.
   * Example: `https://my-company.internal/api`
   */
  baseUrl: string;

  /**
   * Optional authentication.
   * Many internal services accept `Authorization: Bearer <token>`, but you can also pass custom headers.
   */
  apiKey?: string;
  headers?: Record<string, string>;
};

function normalizeMessage(message: ChatCompletionMessageParam) {
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);
  return { role: message.role, content };
}

const ExampleRestApiAgentResponseTextSchema = z.object({
  response: z.string(),
});
