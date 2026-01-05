import { AbstractScorer, BaseScorerResult } from "@/scorers/abstract";

function normalize(input: string): string {
  return input.toLowerCase();
}

/**
 * This is the deterministic scorer for the multi-scorer example.
 *
 * The "runner" decides which scorer to use (based on `scorer.kind`), but each scorer is still a normal
 * class that just exposes `score(...)`.
 *
 * This scorer looks for keyword coverage. It's a good mental model for real-world deterministic scoring:
 * it’s cheap, stable, and explainable, but it can be too strict for tasks where "meaning" matters more
 * than literal strings. That’s why the same benchmark can also offer an LLM judge scorer.
 */
export class ExampleMSKeywordsScorer extends AbstractScorer {
  override readonly kind = "example.ms.keywords";

  override async score(params: {
    requiredKeywords: string[];
    response: string;
  }): Promise<BaseScorerResult & { present: string[]; missing: string[] }> {
    const haystack = normalize(params.response);
    const present: string[] = [];
    const missing: string[] = [];

    for (const keyword of params.requiredKeywords) {
      if (haystack.includes(normalize(keyword))) {
        present.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    const value = params.requiredKeywords.length
      ? present.length / params.requiredKeywords.length
      : 1;

    return {
      value,
      explanation:
        missing.length === 0 ? "All keywords present" : "Missing keywords",
      present,
      missing,
      metadata: {
        presentCount: present.length,
        missingCount: missing.length,
      },
    };
  }
}
