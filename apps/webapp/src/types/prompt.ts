export const PromptAccessReasons = {
  edit: "edit",
} as const;

export type PromptAccessReason =
  (typeof PromptAccessReasons)[keyof typeof PromptAccessReasons];
