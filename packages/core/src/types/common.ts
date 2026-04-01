export type Id = string;

export type IdGenerator<TInput = unknown> = (input: TInput) => MaybePromise<Id>;

export type MaybePromise<T> = T | Promise<T>;

export const PEERBENCH_NAMESPACE = "peerbench.ai" as const;

export const CATEGORIES = {
  LLM: "llm",
} as const;

export const ScoringMethod = {
  ai: "ai",
  human: "human",
  algo: "algo",
} as const;
export type ScoringMethod = (typeof ScoringMethod)[keyof typeof ScoringMethod];
