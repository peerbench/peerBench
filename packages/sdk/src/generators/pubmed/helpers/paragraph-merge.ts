/**
 * Merges the paragraphs of a Pubmed article into a single string.
 */
export function paragraphMerge(
  paragraphs: Record<string, string>,
  strategy: ParagraphMergeStrategyType
) {
  switch (strategy) {
    case ParagraphMergeStrategy.WithoutTitles:
      return Object.entries(paragraphs)
        .map(([, value]) => value)
        .join("\n");
    case ParagraphMergeStrategy.TitlesAsSentences:
      return Object.entries(paragraphs)
        .map(([key, value]) => `${key}. ${value}`)
        .join("\n");
    case ParagraphMergeStrategy.TitlesWithinSentences:
      return Object.entries(paragraphs)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    default:
      throw new Error(`Invalid paragraph merge strategy: ${strategy}`);
  }
}

export const ParagraphMergeStrategy = {
  WithoutTitles: "without-titles",
  TitlesAsSentences: "with-titles-as-sentences",
  TitlesWithinSentences: "titles-within-sentences",
} as const;
export type ParagraphMergeStrategyType =
  (typeof ParagraphMergeStrategy)[keyof typeof ParagraphMergeStrategy];
