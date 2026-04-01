import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { api, type Result } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { JsonDisplay } from "@/components/ui/JsonDisplay";
import { Button } from "@/components/ui/button";
import { AgentName } from "@/components/AgentName";
import { useRun, useCancelRun } from "@/lib/queries";
import { Download } from "lucide-react";

interface TargetStats {
  model: string;
  endpointUrl: string | null;
  provider: string | null;
  count: number;
  successCount: number;
  failedCount: number;
  avgScore: number | null;
  avgDurationMs: number | null;
  p90DurationMs: number | null;
  p99DurationMs: number | null;
  avgTtftMs: number | null; // Average time to first token
  totalTokens: number;
  passRate: number | null;
  passCount: number;
}

function calculatePercentile(
  sortedValues: number[],
  percentile: number
): number | null {
  if (sortedValues.length === 0) return null;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

async function fetchAllRunResults(
  runId: string
): Promise<{ results: Result[]; total: number }> {
  const allResults: Result[] = [];
  const limit = 100;
  let offset = 0;
  let total = 0;

  while (true) {
    const response = await api.getRunResults(runId, { limit, offset });
    allResults.push(...response.results);
    total = response.total;

    // If we got fewer results than the limit, or we've fetched all results, we're done
    if (response.results.length < limit || allResults.length >= total) {
      break;
    }

    offset += limit;
  }

  // Deduplicate by result ID (pagination may overlap during live runs)
  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return { results: deduped, total };
}

function computeTargetStats(results: Result[], threshold?: number): TargetStats[] {
  const byModel = new Map<
    string,
    {
      scores: number[];
      durations: number[];
      ttfts: number[];
      successCount: number;
      failedCount: number;
      totalTokens: number;
      passCount: number;
      count: number;
      endpointUrl: string | null;
      provider: string | null;
    }
  >();

  for (const r of results) {
    const model = r.modelSlug || "unknown";
    const endpoint = r.agentEndpointUrl || "";
    const key = `${model}||${endpoint}`;
    let stats = byModel.get(key);
    if (!stats) {
      stats = {
        scores: [],
        durations: [],
        ttfts: [],
        successCount: 0,
        failedCount: 0,
        totalTokens: 0,
        passCount: 0,
        count: 0,
        endpointUrl: r.agentEndpointUrl,
        provider: r.agentProvider,
      };
      byModel.set(key, stats);
    }
    stats.count++;
    if (r.status === "failed") {
      stats.scores.push(0);
    } else if (r.scoreValue != null) {
      stats.scores.push(r.scoreValue);
    }
    if (r.durationMs != null) stats.durations.push(r.durationMs);
    if (r.ttftMs != null) stats.ttfts.push(r.ttftMs);
    if (r.status === "success") stats.successCount++;
    if (r.status === "failed") stats.failedCount++;
    stats.totalTokens += (r.inputTokensUsed || 0) + (r.outputTokensUsed || 0);
    if (threshold != null) {
      const score = r.status === "failed" ? 0 : r.scoreValue;
      if (score != null && score >= threshold) {
        stats.passCount++;
      }
    }
  }

  const result: TargetStats[] = [];
  for (const [key, stats] of byModel) {
    const model = key.split("||")[0];
    // Sort durations for percentile calculations
    const sortedDurations = [...stats.durations].sort((a, b) => a - b);

    result.push({
      model,
      endpointUrl: stats.endpointUrl,
      provider: stats.provider,
      count: stats.count,
      successCount: stats.successCount,
      failedCount: stats.failedCount,
      avgScore:
        stats.scores.length > 0
          ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
          : null,
      avgDurationMs:
        stats.durations.length > 0
          ? Math.round(
              stats.durations.reduce((a, b) => a + b, 0) /
                stats.durations.length
            )
          : null,
      p90DurationMs:
        sortedDurations.length > 0
          ? Math.round(calculatePercentile(sortedDurations, 90) ?? 0)
          : null,
      p99DurationMs:
        sortedDurations.length > 0
          ? Math.round(calculatePercentile(sortedDurations, 99) ?? 0)
          : null,
      avgTtftMs:
        stats.ttfts.length > 0
          ? Math.round(
              stats.ttfts.reduce((a, b) => a + b, 0) / stats.ttfts.length
            )
          : null,
      totalTokens: stats.totalTokens,
      passRate:
        threshold != null && stats.scores.length > 0
          ? stats.passCount / stats.scores.length
          : null,
      passCount: stats.passCount,
    });
  }

  // Sort by avgScore descending (best first)
  result.sort((a, b) => {
    if (a.avgScore == null && b.avgScore == null) return 0;
    if (a.avgScore == null) return 1;
    if (b.avgScore == null) return -1;
    return b.avgScore - a.avgScore;
  });

  return result;
}

type SortField =
  | "none"
  | "score-asc"
  | "score-desc"
  | "duration-asc"
  | "duration-desc";
type StatusFilter = "all" | "failed" | "success";

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<Result[]>([]);
  const [resultsTotal, setResultsTotal] = useState(0);

  // Filtering & Sorting state — initialized from URL params
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all",
  );
  const [targetFilter, setTargetFilter] = useState<string>(
    searchParams.get("target") || "all",
  );
  const [endpointFilter, setEndpointFilter] = useState<string>(
    searchParams.get("endpoint") || "all",
  );
  const [maxScore, setMaxScore] = useState<string>(
    searchParams.get("max_score") || "",
  );
  const [sortBy, setSortBy] = useState<SortField>(
    (searchParams.get("sort") as SortField) || "none",
  );
  const [testCaseFilter, setTestCaseFilter] = useState<string>(
    searchParams.get("filter_test_case") || "",
  );
  const [passThreshold, setPassThreshold] = useState<string>(
    searchParams.get("pass_threshold") ?? "51",
  );
  const [minTargetsRight, setMinTargetsRight] = useState<string>(
    searchParams.get("min_right") || "",
  );
  const [minTargetsWrong, setMinTargetsWrong] = useState<string>(
    searchParams.get("min_wrong") || "",
  );

  // Sync filter state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (targetFilter !== "all") params.set("target", targetFilter);
    if (endpointFilter !== "all") params.set("endpoint", endpointFilter);
    if (maxScore !== "") params.set("max_score", maxScore);
    if (sortBy !== "none") params.set("sort", sortBy);
    if (testCaseFilter !== "") params.set("filter_test_case", testCaseFilter);
    if (passThreshold !== "51") params.set("pass_threshold", passThreshold);
    if (minTargetsRight !== "") params.set("min_right", minTargetsRight);
    if (minTargetsWrong !== "") params.set("min_wrong", minTargetsWrong);
    setSearchParams(params, { replace: true });
  }, [statusFilter, targetFilter, endpointFilter, maxScore, sortBy, testCaseFilter, passThreshold, minTargetsRight, minTargetsWrong, setSearchParams]);

  // Use TanStack Query for run data with polling
  // Poll every 2 seconds when run is pending or running
  const {
    data: run,
    isLoading: loadingRun,
    isError: loadFailed,
  } = useRun(id ?? "", {
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
  });

  // Derive loading state
  const loading = loadingRun;

  // Cancel run mutation
  const cancelRunMutation = useCancelRun();

  const handleCancelRun = () => {
    if (!id || cancelRunMutation.isPending) return;
    cancelRunMutation.mutate(id);
  };

  // Fetch all results with custom pagination (unique pattern for this page)
  useEffect(() => {
    if (!id) return;
    fetchAllRunResults(id)
      .then(({ results: r, total }) => {
        setResults(r);
        setResultsTotal(total);
      })
      .catch(() => {});
  }, [id]);

  // Re-fetch results when run is in progress (polling)
  useEffect(() => {
    if (!id || !run) return;
    if (run.status !== "pending" && run.status !== "running") return;

    const interval = setInterval(() => {
      fetchAllRunResults(id)
        .then(({ results: r, total }) => {
          setResults(r);
          setResultsTotal(total);
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [id, run?.status]);

  // Get unique targets and endpoints for filter dropdowns
  const uniqueTargets = [
    ...new Set(results.map((r) => r.modelSlug || "unknown")),
  ].sort();
  const uniqueEndpoints = [
    ...new Set(results.map((r) => r.agentEndpointUrl).filter(Boolean)),
  ].sort() as string[];

  const parsedThreshold =
    passThreshold !== "" && !isNaN(parseFloat(passThreshold))
      ? parseFloat(passThreshold) / 100
      : undefined;

  const parsedMinRight =
    minTargetsRight !== "" && !isNaN(parseInt(minTargetsRight))
      ? parseInt(minTargetsRight)
      : undefined;
  const parsedMinWrong =
    minTargetsWrong !== "" && !isNaN(parseInt(minTargetsWrong))
      ? parseInt(minTargetsWrong)
      : undefined;

  const targetStats = computeTargetStats(results, parsedThreshold);

  const testCaseAgreementMap = (() => {
    if (parsedThreshold == null) return new Map<string, TestCaseAgreement>();
    const map = new Map<
      string,
      { byTarget: Map<string, { scores: number[]; right: boolean }> }
    >();
    for (const r of results) {
      const targetKey = `${r.modelSlug || "unknown"}||${r.agentEndpointUrl || ""}`;
      // Group by base test case ID (before "::" if present)
      const baseTestCaseId = r.testCaseId.includes("::")
        ? r.testCaseId.split("::")[0]
        : r.testCaseId;
      let entry = map.get(baseTestCaseId);
      if (!entry) {
        entry = { byTarget: new Map() };
        map.set(baseTestCaseId, entry);
      }
      if (!entry.byTarget.has(targetKey)) {
        const score = r.status === "failed" ? 0 : r.scoreValue;
        if (score != null) {
          entry.byTarget.set(targetKey, {
            scores: [score],
            right: score >= parsedThreshold,
          });
        }
      }
    }
    const agreementResult = new Map<string, TestCaseAgreement>();
    for (const [testCaseId, entry] of map) {
      let rightCount = 0;
      let wrongCount = 0;
      const allScores: number[] = [];
      for (const [, targetData] of entry.byTarget) {
        if (targetData.right) rightCount++;
        else wrongCount++;
        allScores.push(...targetData.scores);
      }
      agreementResult.set(testCaseId, {
        testCaseId,
        rightCount,
        wrongCount,
        totalTargets: entry.byTarget.size,
        scores: allScores,
        avgScore:
          allScores.length > 0
            ? allScores.reduce((a, b) => a + b, 0) / allScores.length
            : 0,
        minScore: allScores.length > 0 ? Math.min(...allScores) : 0,
        maxScore: allScores.length > 0 ? Math.max(...allScores) : 0,
      });
    }
    return agreementResult;
  })();

  const hardestTestCases = [...testCaseAgreementMap.values()]
    .filter((a) => a.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.avgScore - b.avgScore)
    .slice(0, 3);

  // Apply filters and sorting
  const filteredResults = results
    .filter((r) => {
      // Status filter
      if (statusFilter === "failed" && r.status !== "failed") return false;
      if (statusFilter === "success" && r.status !== "success") return false;

      // Target filter
      if (targetFilter !== "all" && (r.modelSlug || "unknown") !== targetFilter)
        return false;

      // Endpoint filter
      if (endpointFilter !== "all" && r.agentEndpointUrl !== endpointFilter)
        return false;

      // Max score filter
      if (maxScore !== "") {
        const threshold = parseFloat(maxScore);
        if (
          !isNaN(threshold) &&
          r.scoreValue != null &&
          r.scoreValue > threshold
        )
          return false;
      }

      // Test case filter (free text search)
      if (testCaseFilter !== "") {
        const searchLower = testCaseFilter.toLowerCase();
        if (!r.testCaseId.toLowerCase().includes(searchLower)) return false;
      }

      // Agreement filters
      if (parsedMinRight != null || parsedMinWrong != null) {
        const baseId = r.testCaseId.includes("::")
          ? r.testCaseId.split("::")[0]
          : r.testCaseId;
        const agreement = testCaseAgreementMap.get(baseId);
        if (!agreement) return false;
        if (parsedMinRight != null && agreement.rightCount < parsedMinRight)
          return false;
        if (parsedMinWrong != null && agreement.wrongCount < parsedMinWrong)
          return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "score-asc":
          if (a.scoreValue == null) return 1;
          if (b.scoreValue == null) return -1;
          return a.scoreValue - b.scoreValue;
        case "score-desc":
          if (a.scoreValue == null) return 1;
          if (b.scoreValue == null) return -1;
          return b.scoreValue - a.scoreValue;
        case "duration-asc":
          if (a.durationMs == null) return 1;
          if (b.durationMs == null) return -1;
          return a.durationMs - b.durationMs;
        case "duration-desc":
          if (a.durationMs == null) return 1;
          if (b.durationMs == null) return -1;
          return b.durationMs - a.durationMs;
        default:
          return 0;
      }
    });

  const hasActiveFilters =
    statusFilter !== "all" ||
    targetFilter !== "all" ||
    endpointFilter !== "all" ||
    maxScore !== "" ||
    sortBy !== "none" ||
    testCaseFilter !== "" ||
    minTargetsRight !== "" ||
    minTargetsWrong !== "";

  const overallPassRate = (() => {
    if (parsedThreshold == null) return null;
    const scored = results.filter(
      (r) => r.scoreValue != null || r.status === "failed"
    );
    if (scored.length === 0) return null;
    const passing = scored.filter((r) => {
      const score = r.status === "failed" ? 0 : r.scoreValue!;
      return score >= parsedThreshold;
    });
    return passing.length / scored.length;
  })();

  const handleExportJson = useCallback(() => {
    if (!run) return;

    const activeFilters: Record<string, string> = {};
    if (statusFilter !== "all") activeFilters.status = statusFilter;
    if (targetFilter !== "all") activeFilters.target = targetFilter;
    if (endpointFilter !== "all") activeFilters.endpoint = endpointFilter;
    if (maxScore !== "") activeFilters.maxScore = maxScore;
    if (testCaseFilter !== "") activeFilters.testCaseFilter = testCaseFilter;
    if (minTargetsRight !== "") activeFilters.minTargetsRight = minTargetsRight;
    if (minTargetsWrong !== "") activeFilters.minTargetsWrong = minTargetsWrong;

    const exportData = {
      run: {
        id: run.id,
        status: run.status,
        configId: run.configId,
        totalTestCases: run.totalTestCases,
        completedTestCases: run.completedTestCases,
        successfulTestCases: run.successfulTestCases,
        failedTestCases: run.failedTestCases,
        avgScore: run.avgScore,
      },
      filters: Object.keys(activeFilters).length > 0 ? activeFilters : null,
      totalResults: resultsTotal,
      filteredCount: filteredResults.length,
      results: filteredResults.map((r) => ({
        id: r.id,
        testCaseId: r.testCaseId,
        modelSlug: r.modelSlug,
        agentEndpointUrl: r.agentEndpointUrl,
        status: r.status,
        scoreValue: r.scoreValue,
        durationMs: r.durationMs,
        errorMessage: r.errorMessage,
        response: r.response,
        score: r.score,
        testCase: r.testCase,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = hasActiveFilters ? "-filtered" : "";
    a.download = `run-${run.id.substring(0, 8)}${suffix}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [run, filteredResults, resultsTotal, hasActiveFilters, statusFilter, targetFilter, endpointFilter, maxScore, testCaseFilter, minTargetsRight, minTargetsWrong]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (loadFailed)
    return <div className="text-center py-8">Failed to load run.</div>;
  if (!run) return <div className="text-center py-8">Run not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-gray-500 hover:text-gray-700"
            >
              <Link to="/runs">Runs</Link>
            </Button>
            <span>/</span>
            <span className="font-mono">{run.id.substring(0, 8)}...</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Run Details
            <StatusBadge
              status={
                run.status as
                  | "pending"
                  | "running"
                  | "completed"
                  | "failed"
                  | "partial"
              }
            />
          </h1>
        </div>
      </div>

      <div
        className={`grid grid-cols-2 ${overallPassRate != null ? "md:grid-cols-6" : "md:grid-cols-5"} gap-4`}
      >
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Tests</p>
          <p className="text-2xl font-bold">{run.totalTestCases}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {run.completedTestCases}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Successful</p>
          <p className="text-2xl font-bold text-green-600">
            {run.successfulTestCases}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">
            {run.failedTestCases}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Avg Score</p>
          <div className="mt-1">
            <ScoreBadge score={run.avgScore} size="lg" />
          </div>
        </div>
        {overallPassRate != null && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">
              Pass Rate ({"\u2265"}
              {passThreshold}%)
            </p>
            <p
              className={`text-2xl font-bold ${overallPassRate >= 0.5 ? "text-green-600" : "text-red-600"}`}
            >
              {Math.round(overallPassRate * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Per-Target Stats */}
      {targetStats.length > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Performance by Target
                </h3>
                <div className="flex items-center gap-1.5">
                  <label className="text-gray-500 text-xs">Pass ≥</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="%"
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white w-14"
                  />
                  <span className="text-gray-500 text-xs">%</span>
                </div>
                {targetStats.some((s) => s.failedCount > 0) && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    Failed results counted as score 0
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {targetStats.map((stats, idx) => (
                  <div
                    key={`${stats.model}||${stats.endpointUrl || ""}`}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={`w-5 text-center font-bold ${idx === 0 ? "text-yellow-600" : "text-gray-400"}`}
                    >
                      {idx + 1}.
                    </span>
                    <div className="flex-1">
                      <AgentName
                        name={stats.model}
                        provider={stats.provider}
                        endpointUrl={stats.endpointUrl}
                        className="font-medium text-gray-900 truncate"
                      />
                    </div>
                    <span className="text-gray-500 text-xs">
                      {stats.count} tests
                      {stats.failedCount > 0 && (
                        <span className="text-red-500 ml-1">
                          ({stats.failedCount} failed)
                        </span>
                      )}
                    </span>
                    <ScoreBadge score={stats.avgScore} size="sm" />
                    {stats.passRate != null && (
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          stats.passRate >= 0.5
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {Math.round(stats.passRate * 100)}% pass
                      </span>
                    )}
                    <span
                      className="text-gray-500 text-xs text-right"
                      title={`Avg: ${stats.avgDurationMs ?? "—"}ms / p90: ${stats.p90DurationMs ?? "—"}ms / p99: ${stats.p99DurationMs ?? "—"}ms${stats.avgTtftMs != null ? ` / TTFT: ${stats.avgTtftMs}ms` : ""}`}
                    >
                      {stats.avgDurationMs ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{stats.avgDurationMs}ms</span>
                          {(stats.p90DurationMs || stats.p99DurationMs) && (
                            <span className="text-gray-400 text-xs">
                              (p90: {stats.p90DurationMs}ms, p99:{" "}
                              {stats.p99DurationMs}ms)
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>
                    <span
                      className="text-gray-400 text-xs w-20 text-right"
                      title="Total tokens"
                    >
                      {stats.totalTokens > 0
                        ? `${stats.totalTokens.toLocaleString()} tok`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

      {/* Hardest Test Cases */}
      {targetStats.length > 1 &&
        parsedThreshold != null &&
        hardestTestCases.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Hardest Test Cases
            </h3>
            <div className="space-y-2">
              {hardestTestCases.map((tc) => (
                <button
                  key={tc.testCaseId}
                  onClick={() => setTestCaseFilter(tc.testCaseId)}
                  className="flex items-center gap-3 text-sm w-full text-left hover:bg-gray-50 rounded px-2 py-1 -mx-2"
                >
                  <span className="font-mono text-gray-700 truncate max-w-[200px]">
                    {tc.testCaseId.length > 20
                      ? tc.testCaseId.substring(0, 20) + "..."
                      : tc.testCaseId}
                  </span>
                  <span className="text-red-600 text-xs font-medium">
                    {tc.wrongCount} of {targetStats.length} targets failed
                  </span>
                  <span className="text-gray-500 text-xs">
                    avg: {Math.round(tc.avgScore * 100)}%
                  </span>
                  <span className="text-gray-400 text-xs">
                    range: {Math.round(tc.minScore * 100)}–
                    {Math.round(tc.maxScore * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      {(run.status === "running" || run.status === "pending") && (
        <div className="bg-white rounded-lg shadow p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm font-semibold text-blue-700">
                Run in Progress
              </span>
            </div>
            <span className="text-sm text-gray-600 font-medium">
              {run.completedTestCases} / {run.totalTestCases} completed
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
              style={{
                width: `${run.totalTestCases > 0 ? (run.completedTestCases / run.totalTestCases) * 100 : 0}%`,
              }}
            >
              {run.totalTestCases > 0 &&
                (run.completedTestCases / run.totalTestCases) * 100 > 10 && (
                  <span className="text-xs text-white font-medium">
                    {Math.round(
                      (run.completedTestCases / run.totalTestCases) * 100
                    )}
                    %
                  </span>
                )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            {run.totalTestCases > 0 && (
              <p className="text-xs text-gray-500">
                {run.totalTestCases - run.completedTestCases} test case
                {run.totalTestCases - run.completedTestCases !== 1
                  ? "s"
                  : ""}{" "}
                remaining
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelRun}
              disabled={cancelRunMutation.isPending}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              {cancelRunMutation.isPending ? "Cancelling..." : "Cancel Run"}
            </Button>
          </div>
        </div>
      )}

      {run.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
          <p className="text-sm text-red-700">{run.errorMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                Results{" "}
                {hasActiveFilters
                  ? `(${filteredResults.length} of ${resultsTotal})`
                  : `(${resultsTotal})`}
              </h2>
              {(run.status === "running" || run.status === "pending") && (
                <svg
                  className="animate-spin h-4 w-4 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </div>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setTargetFilter("all");
                    setEndpointFilter("all");
                    setMaxScore("");
                    setSortBy("none");
                    setTestCaseFilter("");
                    setMinTargetsRight("");
                    setMinTargetsWrong("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
              {filteredResults.length > 0 && (
                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                >
                  <Download className="h-3 w-3" />
                  Export JSON
                </button>
              )}
            </div>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-gray-500 text-xs">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="all">All</option>
                <option value="failed">Failed only</option>
                <option value="success">Success only</option>
              </select>
            </div>

            {/* Target Filter */}
            {uniqueTargets.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label className="text-gray-500 text-xs">Target:</label>
                <select
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white max-w-[180px]"
                >
                  <option value="all">All targets</option>
                  {uniqueTargets.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Endpoint Filter */}
            {uniqueEndpoints.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label className="text-gray-500 text-xs">Endpoint:</label>
                <select
                  value={endpointFilter}
                  onChange={(e) => setEndpointFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white max-w-[220px]"
                >
                  <option value="all">All endpoints</option>
                  {uniqueEndpoints.map((ep) => (
                    <option key={ep} value={ep}>
                      {ep.replace(/^https?:\/\//, "")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Score Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-gray-500 text-xs">Score ≤</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 50"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-16"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <label className="text-gray-500 text-xs">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="none">Default</option>
                <option value="score-asc">Score ↑</option>
                <option value="score-desc">Score ↓</option>
                <option value="duration-asc">Duration ↑</option>
                <option value="duration-desc">Duration ↓</option>
              </select>
            </div>

            {/* Test Case Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-gray-500 text-xs">Test Case:</label>
              <input
                type="text"
                placeholder="Filter by ID..."
                value={testCaseFilter}
                onChange={(e) => setTestCaseFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white w-32"
              />
              {testCaseFilter && (
                <button
                  onClick={() => setTestCaseFilter("")}
                  className="text-gray-400 hover:text-gray-600"
                  title="Clear test case filter"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Agreement Filters */}
            {targetStats.length > 1 && parsedThreshold != null && (
              <>
                <div className="flex items-center gap-1.5">
                  <label className="text-gray-500 text-xs">Min right:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder=""
                    value={minTargetsRight}
                    onChange={(e) => setMinTargetsRight(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white w-12"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-gray-500 text-xs">Min wrong:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder=""
                    value={minTargetsWrong}
                    onChange={(e) => setMinTargetsWrong(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white w-12"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Test Case
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration / TTFT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tokens (In/Out)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result) => {
                  const resultUrl = `/runs/${id}/results/${result.id}`;
                  return (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td>
                        <Link
                          to={resultUrl}
                          className="block px-4 py-3 font-mono text-sm text-inherit no-underline"
                        >
                          {result.testCaseId.substring(0, 12)}...
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={resultUrl}
                          className="block px-4 py-3 text-sm text-gray-500 no-underline"
                        >
                          {result.modelSlug ? (
                            <AgentName
                              name={result.modelSlug}
                              provider={result.agentProvider}
                              endpointUrl={result.agentEndpointUrl}
                            />
                          ) : (
                            "—"
                          )}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={resultUrl}
                          className="block px-4 py-3 no-underline"
                        >
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={
                                result.status as
                                  | "success"
                                  | "failed"
                                  | "partial"
                              }
                              size="sm"
                            />
                            {(!result.response ||
                              result.status === "pending") &&
                              (run.status === "running" ||
                                run.status === "pending") && (
                                <svg
                                  className="animate-spin h-4 w-4 text-blue-600"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                              )}
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={resultUrl}
                          className="block px-4 py-3 no-underline"
                        >
                          {result.scoreValue !== null &&
                          result.scoreValue !== undefined ? (
                            <ScoreBadge score={result.scoreValue} size="sm" />
                          ) : result.status === "failed" &&
                            result.errorMessage ? (
                            <div
                              className="flex items-center gap-1 text-xs text-red-600"
                              title={result.errorMessage}
                            >
                              <svg
                                className="h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="truncate max-w-[200px]">
                                Error
                              </span>
                            </div>
                          ) : run.status === "running" ||
                            run.status === "pending" ? (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <svg
                                className="animate-spin h-3 w-3"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              <span>Scoring...</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={resultUrl}
                          className="block px-4 py-3 text-sm text-gray-500 no-underline"
                        >
                          {result.durationMs ? (
                            <div className="flex flex-col">
                              <span>{result.durationMs}ms</span>
                              {result.ttftMs != null && (
                                <span
                                  className="text-xs text-gray-400"
                                  title="Time to First Token"
                                >
                                  TTFT: {result.ttftMs}ms
                                </span>
                              )}
                            </div>
                          ) : run.status === "running" ||
                            run.status === "pending" ? (
                            <div className="flex items-center gap-1 text-gray-400">
                              <svg
                                className="animate-spin h-3 w-3"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              <span>Running...</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={resultUrl}
                          className="block px-4 py-3 text-sm text-gray-500 no-underline"
                        >
                          {result.inputTokensUsed || result.outputTokensUsed ? (
                            <>
                              {result.inputTokensUsed || 0} /{" "}
                              {result.outputTokensUsed || 0}
                            </>
                          ) : run.status === "running" ||
                            run.status === "pending" ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            "—"
                          )}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : results.length > 0 && filteredResults.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No results match current filters.</p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setTargetFilter("all");
                setEndpointFilter("all");
                setMaxScore("");
                setSortBy("none");
                setTestCaseFilter("");
                setMinTargetsRight("");
                setMinTargetsWrong("");
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No results yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configuration</h2>
          {run.configId && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/configs/${run.configId}`}>View Config</Link>
            </Button>
          )}
        </div>
        <div className="p-4">
          {/* Show Quick Test Override Info */}
          {run.metadata?.triggeredBy === "quick-test" &&
            !!(run.metadata as Record<string, unknown>)?.quickTestOptions &&
            !!(
              (run.metadata as Record<string, unknown>)
                .quickTestOptions as Record<string, unknown>
            )?.endpointBaseOverride && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Endpoint Override Applied (Quick Test)
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-amber-700">Override Base URL: </span>
                    <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-xs">
                      {
                        (
                          (run.metadata as Record<string, unknown>)
                            .quickTestOptions as Record<string, unknown>
                        ).endpointBaseOverride as string
                      }
                    </code>
                  </div>
                  {!!(run.metadata as Record<string, unknown>)
                    .originalEndpoints && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <p className="text-amber-700 mb-2">
                        Original endpoints (before override):
                      </p>
                      <div className="space-y-1">
                        {Object.entries(
                          (run.metadata as Record<string, unknown>)
                            .originalEndpoints as Record<string, string>
                        ).map(([targetId, endpoint]) => (
                          <div
                            key={targetId}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="text-amber-600 font-medium min-w-[100px]">
                              {targetId}:
                            </span>
                            <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-mono break-all">
                              {endpoint}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          <JsonDisplay data={run.configSnapshot} maxHeight={300} />
        </div>
      </div>
    </div>
  );
}

interface TestCaseAgreement {
  testCaseId: string;
  rightCount: number;
  wrongCount: number;
  totalTargets: number;
  scores: number[];
  avgScore: number;
  minScore: number;
  maxScore: number;
}
