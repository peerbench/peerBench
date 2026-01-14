import { RateLimiter } from "@/utils";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources/shared";
import OpenAI, { APIError } from "openai";
import { AbstractLLMProvider, ChatResponse } from "./abstract/llm";
import { PEERBENCH_NAMESPACE } from "@/constants";

export class OpenAIProvider extends AbstractLLMProvider {
  override readonly kind = `${PEERBENCH_NAMESPACE}/llm/openai` as const;

  private client: OpenAI;
  private rateLimiter: RateLimiter;
  private maxRetries: number;

  constructor(config: {
    apiKey: string;
    baseURL: string;
    maxRetries?: number;
    timeout?: number;
    rateLimiter?: RateLimiter;
  }) {
    super();
    this.maxRetries = config.maxRetries ?? 3;
    this.rateLimiter =
      config.rateLimiter ??
      new RateLimiter({
        maxWeight: 20,
        timeWindow: 3_000,
      });

    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      timeout: config.timeout,
      dangerouslyAllowBrowser: true,
    });
  }

  async forward(args: {
    messages: ChatCompletionMessageParam[];
    model: string;
    abortSignal?: AbortSignal;
    temperature?: number;
    responseFormat?:
      | ResponseFormatText
      | ResponseFormatJSONSchema
      | ResponseFormatJSONObject;
  }): Promise<ChatResponse> {
    let retryCount = this.maxRetries;
    while (retryCount > 0) {
      let startedAt: Date = new Date();

      try {
        const response = await this.rateLimiter.execute(
          async () => {
            // Capture the start time of the request
            startedAt = new Date();
            return await this.client.chat.completions.create(
              {
                model: args.model,
                messages: args.messages,
                temperature: args.temperature,
                response_format: args.responseFormat,
              },
              // Signal for request
              { signal: args.abortSignal }
            );
          },
          // Signal for rate limiting
          { signal: args.abortSignal }
        );

        if ("error" in response) {
          const err = response.error as any;
          throw new Error(
            `${err.message} - Code ${err.code} - ${JSON.stringify(err)}`
          );
        }

        if (!response?.choices?.[0]?.message?.content) {
          throw new Error("No content returned from the model");
        }

        return {
          data: response.choices[0].message.content,

          inputTokensUsed: response?.usage?.prompt_tokens,
          outputTokensUsed: response?.usage?.completion_tokens,

          startedAt: startedAt.getTime(),
          completedAt: Date.now(),
        };
      } catch (err) {
        if (err instanceof APIError && err.status === 401) {
          throw new Error(`Invalid credentials provided`, { cause: err });
        }

        retryCount--;

        // More likely an empty HTTP response returned by the Provider
        // and it couldn't be parsed as JSON by the OpenAI SDK. We need to retry the request
        // More info can be found in the following links:
        // https://www.reddit.com/r/SillyTavernAI/comments/1ik95vr/deepseek_r1_on_openrouter_returning_blank_messages/
        // https://github.com/cline/cline/issues/60
        if (err instanceof SyntaxError) {
          console.debug(err);
          continue;
        }

        // If it was another error, just continue until we run out of retries
        if (retryCount !== 0) {
          continue;
        }

        throw new Error(
          `Failed to forward prompt to the model: ${err instanceof Error ? err.message : err}`,
          { cause: err }
        );
      }
    }

    throw new Error(
      `Failed to forward prompt to the model: Max retries reached`,
      { cause: new Error("Max retries reached") }
    );
  }
}
