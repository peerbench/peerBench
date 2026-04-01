import { useState } from "react";
import {
  scoreToVerdict,
  buildExecutiveSummary,
  buildRecommendedNextAction,
  buildFieldRows,
  type FieldRow,
  type EvaluationVerdict,
} from "./scoreToVerdict";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const verdictStyles: Record<
  EvaluationVerdict,
  { bg: string; text: string; border: string }
> = {
  Excellent: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
  },
  Good: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  "Needs Improvement": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  Poor: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
};

const statusStyles: Record<FieldRow["status"], { bg: string; text: string }> = {
  Captured: { bg: "bg-green-100", text: "text-green-800" },
  Missing: { bg: "bg-red-100", text: "text-red-800" },
  "Needs Review": { bg: "bg-amber-100", text: "text-amber-800" },
};

interface EvaluationSummaryProps {
  data: Record<string, unknown>;
  technicalDetails: React.ReactNode;
}

export function EvaluationSummary({
  data,
  technicalDetails,
}: EvaluationSummaryProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const score = typeof data.value === "number" ? data.value : 0;
  const verdict = scoreToVerdict(score);
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  const expectedCount =
    (typeof data.expectedCount === "number" ? data.expectedCount : null) ??
    (typeof meta.expectedCount === "number" ? meta.expectedCount : null) ??
    0;
  const matchedCount =
    (typeof data.matchedCount === "number" ? data.matchedCount : null) ??
    (typeof meta.matchedCount === "number" ? meta.matchedCount : null) ??
    0;

  const summary = buildExecutiveSummary(
    data as Parameters<typeof buildExecutiveSummary>[0]
  );
  const nextAction = buildRecommendedNextAction(
    data as Parameters<typeof buildRecommendedNextAction>[0]
  );
  const rows = buildFieldRows(data as Parameters<typeof buildFieldRows>[0]);

  const missingFields = (data.missingFields ??
    meta.missingFields ??
    []) as string[];
  const matchedFields = rows
    .filter((r) => r.status === "Captured")
    .map((r) => r.fieldName);
  const needsReviewFields = rows
    .filter((r) => r.status === "Needs Review")
    .map((r) => r.fieldName);
  const vs = verdictStyles[verdict];
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border p-4 ${vs.bg} ${vs.text} ${vs.border}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-semibold">Verdict: {verdict}</span>
          <span className="text-sm opacity-90">({pct}% score)</span>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Executive summary
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="font-medium text-gray-700">
          {matchedCount} of {expectedCount} required details captured
        </span>
      </div>

      {(matchedFields.length > 0 ||
        missingFields.length > 0 ||
        needsReviewFields.length > 0) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Details at a glance
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {matchedFields.length > 0 && (
              <li>
                <strong>Captured:</strong>{" "}
                {matchedFields.map(formatFieldLabel).join(", ")}
              </li>
            )}
            {missingFields.length > 0 && (
              <li>
                <strong>Missing:</strong>{" "}
                {missingFields.map(formatFieldLabel).join(", ")}
              </li>
            )}
            {needsReviewFields.length > 0 && (
              <li>
                <strong>Needs review:</strong>{" "}
                {needsReviewFields.map(formatFieldLabel).join(", ")}
              </li>
            )}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Field checklist
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const st = statusStyles[row.status];
                return (
                  <TableRow key={row.fieldName}>
                    <TableCell className="font-medium">
                      {formatFieldLabel(row.fieldName)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg} ${st.text}`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {row.value ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Recommended next action
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{nextAction}</p>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-600"
          onClick={() => setShowTechnical((v) => !v)}
        >
          {showTechnical ? "Hide technical details" : "Show technical details"}
        </Button>
        {showTechnical && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            {technicalDetails}
          </div>
        )}
      </div>
    </div>
  );
}
