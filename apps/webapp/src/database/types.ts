export const PromptStatuses = {
  draft: "draft",
  excluded: "excluded",
  included: "included",
} as const;
export type PromptStatus = (typeof PromptStatuses)[keyof typeof PromptStatuses];

export const FileTypes = {
  Prompt: "prompt",
  Score: "score",
  Evaluation: "evaluation",
  Audit: "audit",
} as const;
export type FileType = (typeof FileTypes)[keyof typeof FileTypes];

export const EvaluationSources = {
  PeerBench: "peerBench",
  ForestAI: "forestai",
} as const;

export type EvaluationSource =
  (typeof EvaluationSources)[keyof typeof EvaluationSources];

export const UserRoleOnPromptSet = {
  owner: "owner",
  admin: "admin",
  collaborator: "collaborator",
  reviewer: "reviewer",
  none: "none",
};
export type UserRoleOnPromptSet =
  (typeof UserRoleOnPromptSet)[keyof typeof UserRoleOnPromptSet];

export const PromptSetLicenses = {
  ccBy40: "cc-by-4.0",
  odbl: "odbl",
  cdlaPermissive20: "cdla-permissive-2.0",
  cuda: "cuda",
  fairNoncommercialResearchLicense: "fair-noncommercial-research-license",
} as const;

export type PromptSetLicense =
  (typeof PromptSetLicenses)[keyof typeof PromptSetLicenses];

export const SignatureTypes = {
  cid: "cid",
  sha256: "sha256",
} as const;

export type SignatureType =
  (typeof SignatureTypes)[keyof typeof SignatureTypes];

export const SignatureKeyTypes = {
  secp256k1n: "secp256k1n",
} as const;

export type SignatureKeyType =
  (typeof SignatureKeyTypes)[keyof typeof SignatureKeyTypes];

export const QuickFeedbackOpinions = {
  positive: "positive",
  negative: "negative",
} as const;

export type QuickFeedbackOpinion =
  (typeof QuickFeedbackOpinions)[keyof typeof QuickFeedbackOpinions];

// NOTE: These Provider identifiers should be matched with the Provider identifiers from the peerbench package
export const ApiKeyProviders = {
  openrouter: "openrouter.ai",
  peerbench: "peerbench",
} as const;
export type ApiKeyProvider =
  (typeof ApiKeyProviders)[keyof typeof ApiKeyProviders];
