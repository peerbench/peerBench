/**
 * @deprecated Use `QuickFeedbackOpinions` instead.
 */
export const ReviewOpinions = {
  positive: "positive",
  negative: "negative",
} as const;

/**
 * @deprecated Use `QuickFeedbackOpinion` instead.
 */
export type ReviewOpinion =
  (typeof ReviewOpinions)[keyof typeof ReviewOpinions];
