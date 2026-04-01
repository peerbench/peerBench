import type { LanguageModelV3 } from "@ai-sdk/provider";
import { generateText, streamText } from "ai";
import { RateLimiter } from "@/utils";
import { AbstractProvider } from "./abstract";
import { PEERBENCH_NAMESPACE } from "@/constants";
import {
  type CallableLLM,
  type LLMResponse,
  type CallableLLMForwardArgs,
} from "./callables/llm";

export class AISdkProvider extends AbstractProvider.withKind(
  `${PEERBENCH_NAMESPACE}/llm/ai-sdk`
) {
  private rateLimiter: RateLimiter;
  private maxRetries: number;

  constructor(config?: AISdkProviderConfig) {
    super();
    this.maxRetries = config?.maxRetries ?? 2;
    this.rateLimiter =
      config?.rateLimiter ??
      new RateLimiter({
        maxWeight: 20,
        timeWindow: 3_000,
      });
  }

  model(config: AISdkModelConfig): CallableLLM<AISdkProvider> {
    const slug = `${config.aiSdkModel.provider}/${config.aiSdkModel.modelId}`;

    return {
      slug,
      provider: this,
      forward: async (args: CallableLLMForwardArgs): Promise<LLMResponse> => {
        const messages = toModelMessages(args.messages);
        const output = await buildOutputOption(args.responseFormat);

        const baseOptions = {
          model: config.aiSdkModel,
          messages,
          temperature: args.temperature,
          maxOutputTokens: args.maxTokens,
          abortSignal: args.abortSignal,
          maxRetries: this.maxRetries,
        };

        if (config.stream !== false) {
          let startedAt!: number;
          const result = await this.rateLimiter.execute(
            async () => {
              startedAt = Date.now();
              return streamText({
                ...baseOptions,
                ...(output !== undefined ? { output } : {}),
                includeRawChunks: !!config.onChunk,
              } as any);
            },
            { signal: args.abortSignal }
          );

          let text = "";
          let firstTokenAt: number | undefined;
          let chunkMetadata: Record<string, unknown> = {};

          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              if (firstTokenAt === undefined) {
                firstTokenAt = Date.now();
              }
              text += part.text;
            }

            if (part.type === "raw" && config.onChunk) {
              const parsed = config.onChunk(part.rawValue);
              if (parsed) {
                chunkMetadata = { ...chunkMetadata, ...parsed };
              }
            }
          }

          const usage = await result.usage;
          const extracted = extractUsageData(usage);
          const hasChunkMetadata = Object.keys(chunkMetadata).length > 0;

          return {
            data: text,
            startedAt,
            completedAt: Date.now(),
            timeToFirstToken:
              firstTokenAt !== undefined ? firstTokenAt - startedAt : undefined,
            ...extracted,
            metadata: {
              ...extracted.metadata,
              ...(hasChunkMetadata ? { chunkMetadata } : {}),
            },
          };
        }

        let startedAt!: number;
        const result = await this.rateLimiter.execute(
          async () => {
            startedAt = Date.now();
            return generateText({
              ...baseOptions,
              ...(output !== undefined ? { output } : {}),
            } as any);
          },
          { signal: args.abortSignal }
        );

        const extracted = extractUsageData(result.usage);

        return {
          data: result.text,
          startedAt,
          completedAt: Date.now(),
          ...extracted,
        };
      },
    };
  }
}

function toModelMessages(messages: CallableLLMForwardArgs["messages"]) {
  return messages
    .filter(
      (m) => m.role === "system" || m.role === "user" || m.role === "assistant"
    )
    .map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content:
        typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content ?? ""),
    }));
}

let aiModuleCache: Record<string, unknown> | null = null;

async function buildOutputOption(
  responseFormat: CallableLLMForwardArgs["responseFormat"]
): Promise<unknown> {
  if (!responseFormat || responseFormat.type === "text") {
    return undefined;
  }

  if (!aiModuleCache) {
    aiModuleCache = (await import("ai")) as unknown as Record<string, unknown>;
  }

  const Output = aiModuleCache["Output"] as
    | {
        object: (opts: { schema: unknown }) => unknown;
        json: () => unknown;
      }
    | undefined;
  const jsonSchema = aiModuleCache["jsonSchema"] as
    | ((schema: unknown) => unknown)
    | undefined;

  if (!Output || !jsonSchema) {
    return undefined;
  }

  if (responseFormat.type === "json_schema") {
    return Output.object({
      schema: jsonSchema(responseFormat.json_schema.schema),
    });
  }

  if (responseFormat.type === "json_object") {
    return Output.json();
  }

  return undefined;
}

function findNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number") {
      return val;
    }
  }
  return undefined;
}

function findCost(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number") {
      return String(val);
    }
  }
  return undefined;
}

function extractUsageData(usage: {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  raw?: Record<string, unknown> | null;
}) {
  const raw = (usage.raw ?? undefined) as Record<string, unknown> | undefined;

  let inputTokensUsed = usage.inputTokens;
  let outputTokensUsed = usage.outputTokens;
  let inputCost: string | undefined;
  let outputCost: string | undefined;

  if (raw) {
    // Fallback token detection from raw when AI SDK fields are missing
    if (inputTokensUsed === undefined) {
      inputTokensUsed = findNumber(
        raw,
        "prompt_tokens",
        "input_tokens",
        "inputTokens",
        "promptTokenCount"
      );
    }
    if (outputTokensUsed === undefined) {
      outputTokensUsed = findNumber(
        raw,
        "completion_tokens",
        "output_tokens",
        "outputTokens",
        "candidatesTokenCount"
      );
    }

    // Cost detection — check nested cost_details first (OpenRouter pattern),
    // then top-level fields as fallback
    const costDetails = raw["cost_details"] as
      | Record<string, unknown>
      | undefined;

    if (costDetails && typeof costDetails === "object") {
      inputCost = findCost(
        costDetails,
        "upstream_inference_prompt_cost",
        "prompt_cost",
        "input_cost"
      );
      outputCost = findCost(
        costDetails,
        "upstream_inference_completions_cost",
        "completion_cost",
        "output_cost"
      );
    }

    if (!inputCost && !outputCost) {
      inputCost = findCost(raw, "prompt_cost", "input_cost");
      outputCost = findCost(raw, "completion_cost", "output_cost");
    }
  }

  return {
    inputTokensUsed,
    outputTokensUsed,
    inputCost,
    outputCost,
    metadata: raw ? { raw } : undefined,
  };
}

type AISdkProviderConfig = {
  /** Rate limiter instance to control request throughput. Defaults to 20 requests per 3 seconds. */
  rateLimiter?: RateLimiter;
  /** Maximum number of retries for failed requests. Handled internally by the AI SDK. @default 2 */
  maxRetries?: number;
};

type AISdkModelConfig = {
  /** The AI SDK model instance (e.g. `openai("gpt-4o")`, `anthropic("claude-4-sonnet")`). */
  aiSdkModel: LanguageModelV3;
  /**
   * Whether to use streaming internally. Enables TTFT measurement
   * and raw SSE chunk processing via `onChunk`.
   * @default true
   */
  stream?: boolean;
  /**
   * Callback invoked for each raw SSE chunk during streaming.
   * Return an object to merge its fields into `metadata.chunkMetadata`,
   * or `undefined` to skip.
   * Requires `stream` to be `true` (default).
   */
  onChunk?: (rawValue: unknown) => Record<string, unknown> | undefined;
};
