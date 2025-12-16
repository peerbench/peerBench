import { ForwardError, PEERBENCH_ERROR_CODES } from "@/errors";
import { Content, GoogleGenAI } from "@google/genai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import {
  AbstractLLMProvider,
  ForwardResponse,
  LLMModel,
  LLMProviderForwardOptions,
} from "../abstract/abstract-llm-provider";
import { RateLimiter } from "@/utils";

export class GoogleLLMProvider extends AbstractLLMProvider {
  private genai: GoogleGenAI;
  private rateLimiter: RateLimiter;
  private maxRetries: number;
  private timeout: number;

  static readonly identifier = "google";

  constructor(options: GoogleLLMProviderOptions) {
    super();

    this.rateLimiter =
      options.rateLimiter ??
      new RateLimiter({
        maxWeight: 20,
        timeWindow: 3_000,
      });
    this.maxRetries = options.maxRetries ?? 5;
    this.timeout = options.timeout ?? 5 * 60_000;

    this.genai = new GoogleGenAI({
      apiKey: options.apiKey,

      httpOptions: {
        timeout: this.timeout,
      },
    });
  }

  async getModels(): Promise<LLMModel[]> {
    // Google generative AI API compatible with OpenAI API but not fully.
    // That's why we are using their own SDK to fetch the model list instead of the
    // the function from the OpenAI client.

    const list = await this.genai.models.list({
      config: {
        // Google doesn't have this amount of models
        // so it is fine to use a hardcoded page size for the time being
        // instead of doing multiple requests to get all the pages.
        pageSize: 100,
      },
    });

    return list.page
      .filter(
        (m) =>
          m.name &&
          !m.supportedActions?.includes("embedContent") && // Exclude embedding models
          m.supportedActions?.includes("generateContent") &&
          m.supportedActions?.includes("countTokens") &&
          m.supportedActions?.includes("batchGenerateContent")
      )
      .map((m) => ({
        // format: `models/<actual model slug>`
        slug: m.name!.split("/")[1]!,
        owner: "google",
        description: m.description,
        // TODO: Google doesn't expose an API to get the pricing information so the best option would be to hard code them here (per model). This also means that the model list should be hardcoded as well.
        // perMillionTokenInputCost: "0",
        // perMillionTokenOutputCost: "0",
        metadata: {
          displayName: m.displayName,
          version: m.version,
          tunedModelInfo: m.tunedModelInfo,
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
          supportedActions: m.supportedActions,
          temperature: m.temperature,
          maxTemperature: m.maxTemperature,
          topP: m.topP,
          topK: m.topK,
          thinking: m.thinking,
        },
      }));
  }

  async forward(
    input: string | ChatCompletionMessageParam[],
    {
      model,
      system,
      temperature,
      abortSignal,
      rateLimiter,
      responseFormat,
    }: LLMProviderForwardOptions
  ): Promise<ForwardResponse> {
    const { contents, systemPrompt } = this.parseInput(input);
    let retryCount = this.maxRetries;
    while (retryCount > 0) {
      let startedAt = new Date();
      try {
        const response = await (rateLimiter ?? this.rateLimiter).execute(
          async () => {
            startedAt = new Date();
            return await this.genai.models.generateContent({
              model,
              contents,
              config: {
                responseMimeType:
                  responseFormat !== undefined ? "application/json" : undefined,
                responseJsonSchema:
                  responseFormat?.type === "json_schema"
                    ? responseFormat.json_schema
                    : undefined,
                abortSignal,
                temperature,
                systemInstruction: system ?? systemPrompt,
              },
            });
          },
          { signal: abortSignal }
        );

        return {
          data: response.text || "",
          startedAt,
          completedAt: new Date(),
          inputTokensUsed: response.usageMetadata?.promptTokenCount,
          outputTokensUsed: response.usageMetadata?.candidatesTokenCount,
        };
      } catch (err) {
        console.debug("Google Gen AI forward error:", err);
        retryCount--;

        if (retryCount !== 0) {
          continue;
        }
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

  private parseInput(input: string | ChatCompletionMessageParam[]) {
    let contents: Content[] = [];
    let systemPrompt: string | undefined;

    if (Array.isArray(input)) {
      systemPrompt = input.filter((m) => m.role === "system").join(" ");

      contents = input
        .filter(
          (m) =>
            m.content !== undefined && m.content !== null && m.role !== "system"
        )
        .map((m) => {
          let text: string;

          // Other roles are not supported by Google Gen AI
          if (m.role !== "assistant" && m.role !== "user") {
            throw new Error(`Invalid role for the message: ${m.role}`);
          }

          if (typeof m.content === "string") {
            text = m.content;
          } else if ("text" in m.content!) {
            text = m.content.text as string;
          } else {
            // TODO: We may need to properly handle all type of message types. This is just a workaround since we only use text based messages for the time being.
            text = JSON.stringify(m.content);
          }

          return {
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text }],
          };
        });
    } else {
      contents = [{ role: "user", parts: [{ text: input }] }];
    }

    return {
      contents,
      systemPrompt: systemPrompt ? systemPrompt : undefined,
    };
  }
}

export type GoogleLLMProviderOptions = {
  apiKey: string;
  rateLimiter?: RateLimiter;
  maxRetries?: number;
  timeout?: number;
};
