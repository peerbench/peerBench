import { AbstractScorer, BaseScorerResult } from "@/scorers/abstract";

/**
 * A "scorer" is the piece that turns the given data into a numeric score
 * alongside with additional explanation and metadata.
 *
 * A runner can do scoring inline, but having a dedicated scorer is nice when:
 * - you want to reuse the same scoring logic across multiple runners/benchmarks
 * - you want to allow callers to swap scorers easily (e.g. deterministic scorer vs LLM-as-a-judge)
 * - you want to test scoring in isolation without calling a provider
 *
 * Here is an example, simple scorer implementation. It checks exact match (optionally with normalization)
 * of the given expected and actual values. Score values must be between 0 and 1.
 */
export class ExactMatchScorer extends AbstractScorer {
  override readonly kind = "example.peerbench.ai/exact-match" as const;

  override async score(params: {
    expected: string;
    actual: string;
    normalize?: boolean;
  }): Promise<
    BaseScorerResult & {
      metadata: {
        match: boolean;
        normalize: boolean;
        normalized?: { expected: string; actual: string };
      };
    }
  > {
    const normalize = params.normalize ?? true;
    const expected = normalize
      ? normalizeText(params.expected)
      : params.expected;
    const actual = normalize ? normalizeText(params.actual) : params.actual;

    const match = expected === actual;

    return {
      value: match ? 1 : 0,
      explanation: match ? "Exact match" : "Mismatch",
      metadata: {
        match,
        normalize,
        normalized: normalize
          ? { expected: params.expected.trim(), actual: params.actual.trim() }
          : undefined,
      },
    };
  }
}

function normalizeText(input: string) {
  return input.trim().replaceAll("\r\n", "\n");
}
