export const FNOLFieldValueType = {
  string: "string",
  number: "number",
  boolean: "boolean",
  object: "object",
} as const;

export type FNOLFieldValueType =
  (typeof FNOLFieldValueType)[keyof typeof FNOLFieldValueType];

export const FNOLDoneReason = {
  modelProvidedJson: "modelProvidedJson",
  reachedMaxTurns: "reachedMaxTurns",
  forcedFinalJson: "forcedFinalJson",
} as const;

export type FNOLDoneReason =
  (typeof FNOLDoneReason)[keyof typeof FNOLDoneReason];

