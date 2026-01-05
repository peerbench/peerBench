import { AbstractScorer, BaseScorerResult } from "@/scorers/abstract";

function normalizeText(input: string): string {
  return input.trim().replaceAll("\r\n", "\n");
}

/**
 * A "scorer" is the piece that turns (test case + response) into a numeric value.
 *
 * A runner can do scoring inline, but having a dedicated scorer is nice when:
 * - you want to reuse the same scoring logic across multiple runners/benchmarks
 * - you want to swap scorers (e.g. deterministic scorer vs LLM-as-a-judge)
 * - you want to test scoring in isolation without calling a provider
 *
 * This scorer is intentionally boring: it checks exact match (optionally with normalization).
 * When you implement a real benchmark, you can keep this pattern and make the `score(...)` input
 * match your benchmark needs (maybe it needs the full test case, maybe it only needs the expected label).
 */
export class ExampleExactMatchScorer extends AbstractScorer {
  override readonly kind = "example.exactMatch";

  override async score(params: {
    expected: string;
    actual: string;
    normalize?: boolean;
  }): Promise<BaseScorerResult> {
    const normalize = params.normalize ?? true;
    const expected = normalize ? normalizeText(params.expected) : params.expected;
    const actual = normalize ? normalizeText(params.actual) : params.actual;

    const match = expected === actual;

    return {
      value: match ? 1 : 0,
      explanation: match ? "Exact match" : "Mismatch",
      metadata: {
        match,
        normalize,
      },
    };
  }
}
