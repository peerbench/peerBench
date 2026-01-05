import { AbstractScorer, BaseScorerResult } from "./abstract";

export type RegexPattern = {
  /**
   * The regex pattern to match against the response
   */
  regex: RegExp;

  /**
   * The index of the capture group to extract (1-based, like match[1])
   * If not provided, defaults to 1 (first capture group)
   */
  captureGroupIndex?: number;

  /**
   * Optional function to transform the extracted value before validation
   */
  transform?: (value: string) => string | undefined;
};

export type RegexScorerParams = {
  /**
   * The input text to score
   */
  input: string;

  /**
   * Array of regex patterns to try (in order, first match wins)
   */
  patterns: RegexPattern[];

  /**
   * Expected value(s) to match against. Can be a record of expected values for named groups, or a validation function
   */
  expectedValue:
    | Record<string, string>
    | ((groupName: string, match: string) => boolean);

  /**
   * Optional: Which match to use when multiple matches are found
   * Defaults to "last" (uses the last match found)
   */
  matchPreference?: "first" | "last";

  /**
   * Optional: If true, allows partial scoring based on how many groups match
   * For example, if 2 groups are expected and only 1 matches, score would be 0.5
   * Defaults to false (all-or-nothing scoring)
   */
  allowPartialScoring?: boolean;
};

/**
 * Generic Regex scorer. It scores the given input against a set of regex patterns.
 */
export class RegexScorer extends AbstractScorer {
  override readonly kind = "regex";

  override async score(params: RegexScorerParams) {
    // Collect all named group names from all patterns
    const allGroupNames = new Set<string>();
    for (const pattern of params.patterns) {
      const regexSource = pattern.regex.source;
      const namedGroupRegex = /\(\?<(\w+)>/g;

      while (true) {
        const match = namedGroupRegex.exec(regexSource);
        if (match === null) {
          break;
        }

        if (match[1]) {
          allGroupNames.add(match[1]);
        }
      }
    }

    // Initialize result object with all group names set to null (aka not found yet)
    const extractedValues: Record<string, string | null> = {};
    for (const groupName of allGroupNames) {
      extractedValues[groupName] = null;
    }

    // Try regex patterns in order, stop at first successful match
    const matchPreference = params.matchPreference ?? "last";
    for (const pattern of params.patterns) {
      const matches = Array.from(params.input.matchAll(pattern.regex));
      const match = matchPreference === "first" ? matches[0] : matches.at(-1);

      if (match && match.groups) {
        // Extract all named groups from this match
        let hasExtractedValue = false;
        for (const [groupName, groupValue] of Object.entries(match.groups)) {
          if (groupValue !== undefined) {
            let value = groupValue;

            // Apply transformation if provided
            if (pattern.transform) {
              const transformed = pattern.transform(value);
              if (transformed === undefined) {
                continue;
              }
              value = transformed;
            }

            extractedValues[groupName] = value;
            hasExtractedValue = true;
          }
        }
        // If we extracted at least one value, stop processing further patterns
        if (hasExtractedValue) {
          break;
        }
      } else if (match) {
        // Fallback to captureGroupIndex if no named groups
        // For unnamed groups, we can't add to extractedValues by name
        // They are only used for scoring if no named groups are found
        const captureGroupIndex = pattern.captureGroupIndex ?? 1;
        const extractedValue = match[captureGroupIndex];

        if (extractedValue !== undefined) {
          // Apply transformation if provided
          if (pattern.transform) {
            const transformed = pattern.transform(extractedValue);
            if (transformed === undefined) {
              continue;
            }
            // For unnamed groups, we can't store in extractedValues
            // but we can use it for scoring if no named groups were found
          }
          // If we have an extracted value (even if unnamed), stop processing
          // Note: This is a fallback case, so we break here too
          break;
        }
      }
    }

    // Calculate score based on matched value
    const allowPartial = params.allowPartialScoring ?? false;
    let score = 0;

    if (typeof params.expectedValue === "function") {
      // To get proper type inference, cast it using "as"
      const validator = params.expectedValue as typeof params.expectedValue;
      const extractedEntries = Object.entries(extractedValues).filter(
        ([, value]) => value !== null
      );

      // If no values were extracted, score is 0
      if (extractedEntries.length === 0) {
        score = 0;
      } else {
        if (allowPartial) {
          // Count how many extracted values pass validation
          const passingCount = extractedEntries.filter(
            ([groupName, extractedValue]) =>
              validator(groupName, extractedValue as string)
          ).length;
          score = passingCount / extractedEntries.length;
        } else {
          // All extracted values must pass validation
          const allMatch = extractedEntries.every(
            ([groupName, extractedValue]) =>
              validator(groupName, extractedValue as string)
          );
          score = allMatch ? 1 : 0;
        }
      }
    } else {
      const expectedEntries = Object.entries(params.expectedValue);
      const totalExpected = expectedEntries.length;

      if (allowPartial) {
        // Count how many expected values match their extracted values
        const matchingCount = expectedEntries.filter(([key, expectedValue]) => {
          const extractedValue = extractedValues[key];
          return extractedValue !== null && extractedValue === expectedValue;
        }).length;
        score = totalExpected > 0 ? matchingCount / totalExpected : 0;
      } else {
        // All expected values must match
        const allMatch = expectedEntries.every(([key, expectedValue]) => {
          const extractedValue = extractedValues[key];
          return extractedValue !== null && extractedValue === expectedValue;
        });
        score = allMatch ? 1 : 0;
      }
    }

    return {
      value: score,
      extractedAnswers: Object.fromEntries(
        Object.entries(extractedValues).filter(
          (entry): entry is [string, string] => entry[1] !== null
        )
      ),
    } satisfies BaseScorerResult;
  }
}
