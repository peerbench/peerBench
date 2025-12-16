export const PROMPT_FEEDBACK_MIN_TOTAL = 2;
export const PROMPT_FEEDBACK_VERIFIED_RATIO_NUM = 2;
export const PROMPT_FEEDBACK_VERIFIED_RATIO_DEN = 3;

export type PromptFeedbackStatus =
  | "unverified"
  | "verified_positive"
  | "verified_negative"
  | "verified_mixed";

export type PromptFeedbackCounts = {
  positiveQuickFeedbackCount?: number | null;
  negativeQuickFeedbackCount?: number | null;
};

export function getPromptFeedbackStatus(
  counts: PromptFeedbackCounts
): PromptFeedbackStatus {
  const pos = counts.positiveQuickFeedbackCount ?? 0;
  const neg = counts.negativeQuickFeedbackCount ?? 0;
  const total = pos + neg;

  if (total < PROMPT_FEEDBACK_MIN_TOTAL) return "unverified";

  // Use integer math to avoid floating point edge cases.
  // ">= 2/3" is considered verified (user confirmed 2/3 should qualify).
  if (pos * PROMPT_FEEDBACK_VERIFIED_RATIO_DEN >= total * PROMPT_FEEDBACK_VERIFIED_RATIO_NUM) {
    return "verified_positive";
  }
  if (neg * PROMPT_FEEDBACK_VERIFIED_RATIO_DEN >= total * PROMPT_FEEDBACK_VERIFIED_RATIO_NUM) {
    return "verified_negative";
  }

  return "verified_mixed";
}

export const PROMPT_FEEDBACK_STATUS_UI: Record<
  PromptFeedbackStatus,
  { label: string; className: string }
> = {
  verified_positive: {
    label: "Verified: Positive",
    className: "text-green-600",
  },
  verified_negative: {
    label: "Verified: Negative",
    className: "text-red-600",
  },
  verified_mixed: {
    label: "Verified: Mixed",
    className: "text-orange-600",
  },
  unverified: {
    label: "Unverified",
    className: "text-gray-600",
  },
};

export type PromptFeedbackStatusCounts = Record<PromptFeedbackStatus, number>;

export function initPromptFeedbackStatusCounts(): PromptFeedbackStatusCounts {
  return {
    verified_positive: 0,
    verified_negative: 0,
    verified_mixed: 0,
    unverified: 0,
  };
}


