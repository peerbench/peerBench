import {
  AbstractProvider,
  PEERBENCH_NAMESPACE,
  type CallableLLM,
  type LLMResponse,
  type CallableLLMForwardArgs,
} from "@peerbench/core";
import OpenAI, { APIError } from "openai";
import { RateLimiter } from "@/utils/rate-limiter";

export class OpenAIProvider extends AbstractProvider.withKind(
  `${PEERBENCH_NAMESPACE}/llm/openai`,
) {
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

  model(config: { model: string }): CallableLLM<OpenAIProvider> {
    return {
      slug: config.model,
      provider: this,
      forward: async (args: CallableLLMForwardArgs): Promise<LLMResponse> => {
        let retryCount = this.maxRetries;
        while (retryCount > 0) {
          let startedAt: Date = new Date();

          try {
            const response = await this.rateLimiter.execute(
              async () => {
                startedAt = new Date();
                return await this.client.chat.completions.create(
                  {
                    model: config.model,
                    messages: args.messages as any,
                    temperature: args.temperature,
                    response_format: args.responseFormat as any,
                  },
                  { signal: args.abortSignal },
                );
              },
              { signal: args.abortSignal },
            );

            if ("error" in response) {
              const err = response.error as any;
              throw new Error(
                `${err.message} - Code ${err.code} - ${JSON.stringify(err)}`,
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

            if (err instanceof SyntaxError) {
              console.debug(err);
              continue;
            }

            if (retryCount !== 0) {
              continue;
            }

            throw new Error(
              `Failed to forward prompt to the model: ${err instanceof Error ? err.message : err}`,
              { cause: err },
            );
          }
        }

        throw new Error(
          `Failed to forward prompt to the model: Max retries reached`,
          { cause: new Error("Max retries reached") },
        );
      },
    };
  }
}
