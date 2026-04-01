export abstract class AbstractProvider {
  readonly kind: string;

  constructor() {
    this.kind = (this.constructor as typeof AbstractProvider & { kind?: string }).kind!;
    if (!this.kind)
      throw new Error(
        `${this.constructor.name} must define "static readonly kind" as a constant property.`,
      );
  }

  static withKind<
    TKind extends string,
    TThis extends abstract new (...args: any[]) => AbstractProvider,
  >(this: TThis, kind: TKind) {
    const base = this as unknown as new (...args: any[]) => any;
    const derived = class extends base {
      static readonly kind: TKind = kind;
      declare readonly kind: TKind;
    };

    return derived as unknown as (new (
      ...args: any[]
    ) => InstanceType<TThis> & {
      readonly kind: TKind;
    }) & {
      readonly kind: TKind;
    };
  }
}

export type ProviderResponse<TData = unknown> = {
  startedAt: number;
  completedAt: number;
  data: TData;
};

export interface Callable<TProvider = AbstractProvider> {
  readonly provider: TProvider;
}

export interface CallableLLM<
  TProvider extends AbstractProvider = AbstractProvider,
> extends Callable<TProvider> {
  slug: string;
  forward(args: CallableLLMForwardArgs): Promise<LLMResponse>;
}

export type ChatMessage = {
  role: string;
  content: string | unknown;
  [key: string]: unknown;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_schema"; json_schema: { name: string; schema: unknown } }
  | { type: "json_object" };

export type CallableLLMForwardArgs = {
  messages: ChatMessage[];
  abortSignal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: ResponseFormat;
};

export type LLMResponse = ProviderResponse<string> & {
  inputTokensUsed?: number;
  outputTokensUsed?: number;
  inputCost?: string;
  outputCost?: string;
  timeToFirstToken?: number;
  metadata?: Record<string, unknown>;
};
