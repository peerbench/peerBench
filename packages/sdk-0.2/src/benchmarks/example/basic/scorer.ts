import { AbstractScorer, BaseScorerResult } from "@/scorers/abstract";

function normalizeText(input: string): string {
  return input.trim().replaceAll("\r\n", "\n");
}

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

