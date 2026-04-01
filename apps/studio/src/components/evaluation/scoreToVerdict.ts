/**
 * Maps a 0–1 score to a human-readable verdict for business/ops users.
 */
export type EvaluationVerdict =
  | "Excellent"
  | "Good"
  | "Needs Improvement"
  | "Poor";

export function scoreToVerdict(score: number): EvaluationVerdict {
  if (score >= 0.9) return "Excellent";
  if (score >= 0.7) return "Good";
  if (score >= 0.5) return "Needs Improvement";
  return "Poor";
}

export interface FieldRow {
  fieldName: string;
  status: "Captured" | "Missing" | "Needs Review";
  value: string | null;
}

interface PerFieldItem {
  field: string;
  expected?: unknown;
  observed?: unknown;
  equivalent?: boolean;
  reason?: string;
}

interface CorrectnessStyleScoreData {
  value?: number;
  metadata?: {
    expectedCount?: number;
    matchedCount?: number;
    missingFields?: string[];
    mismatchedFields?: Array<{ field: string; observed?: unknown }>;
    perField?: PerFieldItem[];
    notes?: string;
    extractionError?: unknown;
  };
  expectedCount?: number;
  matchedCount?: number;
  missingFields?: string[];
  mismatchedFields?: Array<{ field: string; observed?: unknown }>;
  perField?: PerFieldItem[];
  extractedFacts?: Record<string, unknown> | null;
}

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return JSON.stringify(v);
}

/**
 * Builds a unified list of field rows (Field name, Status, Value) from score data.
 */
export function buildFieldRows(data: CorrectnessStyleScoreData): FieldRow[] {
  const meta = data.metadata;
  const missingFields = data.missingFields ?? meta?.missingFields ?? [];
  const mismatchedFields =
    data.mismatchedFields ?? meta?.mismatchedFields ?? [];
  const perField = data.perField ?? meta?.perField ?? [];
  const extractedFacts = data.extractedFacts ?? null;

  const rowsByField = new Map<string, FieldRow>();

  for (const item of perField) {
    const field = item.field;
    const status: FieldRow["status"] = item.equivalent
      ? "Captured"
      : "Needs Review";
    const value =
      item.observed !== undefined ? formatCellValue(item.observed) : null;
    rowsByField.set(field, { fieldName: field, status, value });
  }

  for (const field of missingFields) {
    if (!rowsByField.has(field)) {
      rowsByField.set(field, {
        fieldName: field,
        status: "Missing",
        value: null,
      });
    }
  }

  for (const m of mismatchedFields) {
    const existing = rowsByField.get(m.field);
    if (existing) {
      existing.status = "Needs Review";
      if (m.observed !== undefined)
        existing.value = formatCellValue(m.observed);
    } else {
      rowsByField.set(m.field, {
        fieldName: m.field,
        status: "Needs Review",
        value: m.observed !== undefined ? formatCellValue(m.observed) : null,
      });
    }
  }

  if (extractedFacts && typeof extractedFacts === "object") {
    for (const key of Object.keys(extractedFacts)) {
      if (!rowsByField.has(key)) {
        const val = extractedFacts[key];
        rowsByField.set(key, {
          fieldName: key,
          status: "Captured",
          value: formatCellValue(val),
        });
      }
    }
  }

  return Array.from(rowsByField.values()).sort((a, b) =>
    a.fieldName.localeCompare(b.fieldName)
  );
}

/**
 * Builds a short executive summary in plain language.
 */
export function buildExecutiveSummary(data: CorrectnessStyleScoreData): string {
  const score = typeof data.value === "number" ? data.value : 0;
  const verdict = scoreToVerdict(score);
  const meta = data.metadata;
  const expectedCount = data.expectedCount ?? meta?.expectedCount ?? 0;
  const matchedCount = data.matchedCount ?? meta?.matchedCount ?? 0;
  const missingCount = (data.missingFields ?? meta?.missingFields ?? []).length;
  const mismatchedCount = (
    data.mismatchedFields ??
    meta?.mismatchedFields ??
    []
  ).length;

  if (verdict === "Excellent") {
    return "The Agent captured all required details correctly. No follow-up is needed for data completeness.";
  }
  if (verdict === "Good") {
    return `The Agent did a solid job: ${matchedCount} of ${expectedCount} required details were captured correctly. A few items may need a quick check.`;
  }
  if (verdict === "Needs Improvement") {
    return `The Agent captured some details but missed or got wrong several items (${missingCount} missing, ${mismatchedCount} incorrect). Review the list below and gather or correct the information.`;
  }
  return `The Agent missed or got wrong most of the required details (${missingCount} missing, ${mismatchedCount} incorrect). Please review the conversation and fill in or correct the information before proceeding.`;
}

/**
 * Returns recommended next action in plain language.
 */
export function buildRecommendedNextAction(
  data: CorrectnessStyleScoreData
): string {
  const score = typeof data.value === "number" ? data.value : 0;
  const verdict = scoreToVerdict(score);
  const meta = data.metadata;
  const missingFields = data.missingFields ?? meta?.missingFields ?? [];

  if (verdict === "Excellent") {
    return "No action required. You can proceed with the claim using the captured information.";
  }
  if (verdict === "Good") {
    return "Optionally review the fields marked “Needs Review” and confirm or correct them. Then you can proceed.";
  }
  if (verdict === "Needs Improvement") {
    const missingList = missingFields.length
      ? missingFields.slice(0, 5).join(", ")
      : "";
    const extra =
      missingFields.length > 5 ? ` and ${missingFields.length - 5} more` : "";
    return `Review the missing and incorrect fields (e.g. ${missingList}${extra}). Re-contact the customer if needed to collect or correct this information, then re-run the evaluation.`;
  }
  return "Do not use this extraction as-is. Re-contact the customer to collect the required details, or correct the conversation and re-run the evaluation.";
}

/**
 * Detects if score data is correctness-style (has expectedCount/matchedCount or metadata with those).
 */
export function isCorrectnessStyleScore(
  data: Record<string, unknown>
): boolean {
  const value = data.value;
  if (typeof value !== "number") return false;
  const meta = data.metadata as Record<string, unknown> | undefined;
  const hasExpected =
    typeof (data.expectedCount ?? meta?.expectedCount) === "number";
  const hasMatched =
    typeof (data.matchedCount ?? meta?.matchedCount) === "number";
  return hasExpected || hasMatched;
}
