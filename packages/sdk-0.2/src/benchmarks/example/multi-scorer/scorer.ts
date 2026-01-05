import { AbstractScorer, BaseScorerResult } from "@/scorers/abstract";

function normalize(input: string): string {
  return input.toLowerCase();
}

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
      explanation: missing.length === 0 ? "All keywords present" : "Missing keywords",
      present,
      missing,
      metadata: {
        presentCount: present.length,
        missingCount: missing.length,
      },
    };
  }
}

