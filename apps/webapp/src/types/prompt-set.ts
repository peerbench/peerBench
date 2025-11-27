export const PromptSetAccessReasons = {
  review: "review",
  submitPrompt: "submit-prompt",
  edit: "edit",
  runBenchmark: "run-benchmark",
} as const;

export type PromptSetAccessReason =
  (typeof PromptSetAccessReasons)[keyof typeof PromptSetAccessReasons];

export const PromptSetVisibilities = {
  public: "public",
  private: "private",
} as const;
export type PromptSetVisibility =
  (typeof PromptSetVisibilities)[keyof typeof PromptSetVisibilities];

export const PromptSetOrderings = {
  mostRecent: "mostRecent",
} as const;
export type PromptSetOrdering =
  (typeof PromptSetOrderings)[keyof typeof PromptSetOrderings];
