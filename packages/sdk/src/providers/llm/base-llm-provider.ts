import { ForwardError } from "@/errors/provider";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { PEERBENCH_ERROR_CODES } from "@/errors/codes";
import { RateLimiter } from "@/utils";
import {
  AbstractLLMProvider,
  ForwardResponse,
  LLMModel,
  LLMProviderForwardOptions,
} from "../abstract/abstract-llm-provider";
import OpenAI, { APIError } from "openai";

/**
 * Base class for OpenAI API compatible LLM Providers. Also implements
 * rate limiting and timeout features for parallel execution.
 */
export abstract class BaseLLMProvider extends AbstractLLMProvider {
  rateLimiter: RateLimiter;
  timeout: number;
  client: OpenAI;
  maxRetries: number;

  /**
   * Initialize a new LLM provider
   * @param options Options for the provider
   */
  constructor({
    apiKey,
    baseURL,
    rateLimiter = new RateLimiter({
      maxWeight: 20,
      timeWindow: 3_000,
    }),
    maxRetries = 5,
    timeout = 5 * 60_000,
  }: BaseLLMProviderOptions) {
    super();

    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.rateLimiter = rateLimiter;

    // Initialize the client
    this.client = new OpenAI({
      baseURL: baseURL,
      apiKey: apiKey,
      maxRetries: maxRetries,
      timeout: timeout,
      dangerouslyAllowBrowser: true,
    });
  }

  /**
   * Fetch all supported models from the provider.
   * @returns Array of models supported by the provider
   */
  async getModels(): Promise<LLMModel[]> {
    const response = await this.client.models.list();
    const models = response.data;

    return models.map((m) => ({
      slug: m.id,
      owner: m.owned_by,
      releaseDate: new Date(m.created),
      contextWindow: (m as any).context_window,
      // OpenAI SDK client doesn't expose more information about a model.
    }));
  }

  async forward(
    input: string | ChatCompletionMessageParam[],
    {
      model,
      system,
      temperature,
      responseFormat,
      abortSignal,
      rateLimiter,
    }: LLMProviderForwardOptions
  ): Promise<ForwardResponse> {
    let retryCount = this.maxRetries;
    while (retryCount > 0) {
      let startedAt: Date = new Date();

      try {
        const messages = this.prepareMessages(input, system);
        const response = await (rateLimiter ?? this.rateLimiter).execute(
          async () => {
            // Capture the start time of the request
            startedAt = new Date();
            return await this.client.chat.completions.create(
              {
                model,
                messages,
                temperature,
                response_format: responseFormat,
              },
              // Signal for request
              { signal: abortSignal, timeout: this.timeout }
            );
          },
          // Signal for rate limiting
          { signal: abortSignal }
        );

        if ("error" in response) {
          const err = response.error as any;
          throw new Error(
            `${err.message} - Code ${err.code} - ${JSON.stringify(err)}`
          );
        }

        return {
          data: response?.choices?.[0]?.message?.content || "",

          inputTokensUsed: response?.usage?.prompt_tokens,
          outputTokensUsed: response?.usage?.completion_tokens,

          startedAt,
          completedAt: new Date(),
        };
      } catch (err) {
        if (err instanceof APIError && err.status === 401) {
          throw new ForwardError(
            `Invalid credentials provided for the Provider`,
            {
              cause: err,
              startedAt,
              code: PEERBENCH_ERROR_CODES.PROVIDER_UNAUTHORIZED,
            }
          );
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

        throw new ForwardError(
          `Failed to forward prompt to the model: ${err instanceof Error ? err.message : err}`,
          {
            cause: err,
            startedAt,
            code: PEERBENCH_ERROR_CODES.PROVIDER_FORWARD_FAILED,
          }
        );
      }
    }

    throw new ForwardError(
      `Failed to forward prompt to the model: Max retries reached`,
      {
        startedAt: new Date(),
        code: PEERBENCH_ERROR_CODES.PROVIDER_MAX_RETRIES_REACHED,
      }
    );
  }

  private prepareMessages(
    input: string | ChatCompletionMessageParam[],
    systemPrompt?: string
  ) {
    const messages: ChatCompletionMessageParam[] = [];

    // If caller decided to pass the messages as an array, use them directly
    if (Array.isArray(input)) {
      messages.push(...input);
    } else {
      // Add system message if provided
      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt,
        });
      }

      // Add user message
      messages.push({
        role: "user",
        content: input,
      });
    }

    return messages;
  }
}

export type BaseLLMProviderOptions = {
  /**
   * Rate limiter that is going to be used while forwarding the prompt to the model
   */
  rateLimiter?: RateLimiter;

  /**
   * API key for the provider
   */
  apiKey: string;

  /**
   * Base URL for the provider
   */
  baseURL?: string;

  /**
   * Maximum number of retries for the provider
   */
  maxRetries?: number;

  /**
   * Timeout for the provider
   */
  timeout?: number;

  /**
   * Rate limit for the provider
   */
  rateLimit?: number;

  /**
   * Rate limit time window for the provider
   */
  rateLimitTimeWindow?: number;
};
