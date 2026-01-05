import {
  AbstractLLMProvider,
  ChatResponse,
  LLMProviderForwardArgs,
} from "../abstract/llm";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

/**
 * Example "custom REST API LLM agent provider".
 *
 * Sometimes you don't call a model API directly. You call your own REST API, and *it* talks to the model.
 * That REST API can hide secrets, run tools, do retrieval, apply guardrails, and whatever else your
 * product needs.
 *
 * In the SDK we still want a clean abstraction, so we model that REST API as an `AbstractLLMProvider`.
 * The runner (or host app) still passes `messages + model`, and the provider still returns one final string.
 *
 * If you’re implementing your own provider, this is the only part that matters: translate
 * `LLMProviderForwardArgs` into your HTTP request, then translate your HTTP response back into
 * `ChatResponse`.
 */
export class ExampleRestApiLLMAgentProvider extends AbstractLLMProvider {
  override readonly kind = "example.restapi.agent";

  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly headers?: Record<string, string>;

  constructor(config: ExampleRestApiAgentProviderConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.headers = config.headers;
  }

  override async forward(args: LLMProviderForwardArgs): Promise<ChatResponse> {
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
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...(this.headers ?? {}),
      },
      body: JSON.stringify({
        model: args.model,
        temperature: args.temperature,
        messages: args.messages.map(normalizeMessage),
      }),
      signal: args.abortSignal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `REST API provider failed: ${response.status} ${response.statusText}${
          body ? ` - ${body}` : ""
        }`
      );
    }

    // Most services return JSON; some return plain text. For an example provider, we support both.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return {
        data: await response.text(),
        startedAt,
        completedAt: Date.now(),
      };
    }

    // Use zod schema to validate the response and get a typed object.
    const parsedResponse = ExampleRestApiAgentResponseTextSchema.parse(
      await response.json()
    );

    return {
      data: parsedResponse.response,
      startedAt,
      completedAt: Date.now(),
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
  // In the SDK, a chat message's `content` can be rich (tool calls, structured parts, ...).
  // Most "REST agent" backends only accept text, so for the example we stringify anything non-text.
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);
  return { role: message.role, content };
}

const ExampleRestApiAgentResponseTextSchema = z.object({
  response: z.string(),
});
