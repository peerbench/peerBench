import { AbstractScorer, BaseScorerResult } from "@/scorers/abstract";
import { stableStringify } from "@/utils/json";

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function normalizeString(value: string): string {
  return value.trim();
}

function valuesEqual(expected: unknown, actual: unknown): boolean {
  if (typeof expected === "string" && typeof actual === "string") {
    return normalizeString(expected) === normalizeString(actual);
  }
  return stableStringify(expected) === stableStringify(actual);
}

export class FNOLFieldsScorer extends AbstractScorer {
  override readonly kind = "fnol.fields";

  override async score(params: {
    fieldsToCollect: Record<
      string,
      { required?: boolean; expected?: unknown; description?: string }
    >;
    extracted?: Record<string, unknown>;
  }): Promise<
    BaseScorerResult & {
      requiredKeys: string[];
      presentKeys: string[];
      missingKeys: string[];
      mismatchedKeys: string[];
    }
  > {
    const extracted = params.extracted ?? {};
    const requiredKeys = Object.entries(params.fieldsToCollect)
      .filter(([, field]) => field.required !== false)
      .map(([key]) => key);

    const presentKeys: string[] = [];
    const missingKeys: string[] = [];
    const mismatchedKeys: string[] = [];

    for (const key of requiredKeys) {
      const value = extracted[key];
      if (isMissing(value)) {
        missingKeys.push(key);
        continue;
      }
      presentKeys.push(key);

      const expected = params.fieldsToCollect[key]?.expected;
      if (expected !== undefined && !valuesEqual(expected, value)) {
        mismatchedKeys.push(key);
      }
    }

    const requiredCount = requiredKeys.length;
    const correctCount = requiredCount - missingKeys.length - mismatchedKeys.length;
    const score = requiredCount === 0 ? 1 : correctCount / requiredCount;

    return {
      value: Math.max(0, Math.min(1, score)),
      explanation:
        missingKeys.length === 0 && mismatchedKeys.length === 0
          ? "All required fields collected"
          : "Missing or mismatched fields",
      requiredKeys,
      presentKeys,
      missingKeys,
      mismatchedKeys,
      metadata: {
        requiredCount,
        presentCount: presentKeys.length,
        missingCount: missingKeys.length,
        mismatchedCount: mismatchedKeys.length,
      },
    };
  }
}

