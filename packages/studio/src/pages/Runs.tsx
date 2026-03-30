import { useState } from "react";
import { Link } from "react-router-dom";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { type Run } from "@/lib/api";
import { useRuns, useRunFilterOptions, useConfigStats } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import {
  TriggerSourceBadge,
  type TriggerMetadata,
} from "@/components/ui/TriggerSourceBadge";
import { DataTable } from "@/components/ui/data-table";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterSelect } from "@/components/ui/FilterSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 25;

export function Runs() {
  const {
    searchParams,
    setFilter,
    clearAllFilters: clearFilters,
    goToPage,
  } = useUrlFilters();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const statusFilter = searchParams.get("status") || undefined;
  const configId = searchParams.get("configId") || undefined;
  const configTagFilter = searchParams.get("configTag") || undefined;
  const runnerFilter = searchParams.get("runner") || undefined;
  const scorerFilter = searchParams.get("scorer") || undefined;
  const sourceFilter = searchParams.get("source") || undefined;
  const agentFilter = searchParams.get("agentId") || undefined;
  const providerFilter = searchParams.get("provider") || undefined;
  const includePracticeRuns =
    searchParams.get("includePracticeRuns") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: runsData, isLoading: loading } = useRuns({
    status: statusFilter,
    configId,
    configTag: configTagFilter,
    runner: runnerFilter,
    scorer: scorerFilter,
    source: sourceFilter,
    agentId: agentFilter,
    provider: providerFilter,
    includePracticeRuns,
    limit: PAGE_SIZE,
    offset,
  });
  const runs = runsData?.runs ?? [];
  const total = runsData?.total ?? 0;

  const { data: filterOptions } = useRunFilterOptions();

  const { data: configStats, isLoading: configStatsLoading } = useConfigStats(
    configId ?? "",
    { days: 30 },
    { enabled: !!configId }
  );

  const hasActiveFilters =
    statusFilter ||
    runnerFilter ||
    scorerFilter ||
    sourceFilter ||
    configId ||
    configTagFilter ||
    agentFilter ||
    providerFilter;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const table = useReactTable({
    data: runs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const toPercent = (s: number) => (s > 1 ? s : s * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benchmark Runs</h1>
          <p className="text-sm text-muted-foreground">{total} total runs</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onValueChange={(v) => setFilter("status", v)}
              placeholder="All statuses"
              options={
                filterOptions?.statuses || [
                  "pending",
                  "running",
                  "completed",
                  "failed",
                  "partial",
                ]
              }
            />

            <FilterSelect
              label="Config Tag"
              value={configTagFilter}
              onValueChange={(v) => setFilter("configTag", v)}
              placeholder="All tags"
              options={filterOptions?.configTags || []}
            />

            <FilterSelect
              label="Runner"
              value={runnerFilter}
              onValueChange={(v) => setFilter("runner", v)}
              placeholder="All runners"
              options={filterOptions?.runners || []}
            />

            <FilterSelect
              label="Scorer"
              value={scorerFilter}
              onValueChange={(v) => setFilter("scorer", v)}
              placeholder="All scorers"
              options={filterOptions?.scorers || []}
            />

            <FilterSelect
              label="Source"
              value={sourceFilter}
              onValueChange={(v) => setFilter("source", v)}
              placeholder="All sources"
              options={[
                { value: "web", label: "Web UI" },
                { value: "trigger", label: "Timed Trigger" },
                { value: "langfuse", label: "Langfuse Trigger" },
                { value: "manual", label: "Manual Fire" },
                { value: "api", label: "API" },
              ]}
            />

            <FilterSelect
              label="Agent"
              value={agentFilter}
              onValueChange={(v) => setFilter("agentId", v)}
              placeholder="All agents"
              options={
                filterOptions?.agents?.map((a) => ({
                  value: a.id,
                  label: a.name,
                })) || []
              }
            />

            <FilterSelect
              label="Provider"
              value={providerFilter}
              onValueChange={(v) => setFilter("provider", v)}
              placeholder="All providers"
              options={filterOptions?.providers || []}
            />

            {/* Config ID indicator */}
            {configId && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Config
                </label>
                <div className="flex items-center gap-1">
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="p-0 h-auto font-mono text-sm"
                  >
                    <Link to={`/configs/${configId}`}>
                      {configId.substring(0, 8)}...
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={() => setFilter("configId", null)}
                  >
                    <svg
                      className="w-4 h-4"
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
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Practice runs checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Checkbox
              id="includePracticeRuns"
              checked={includePracticeRuns}
              onCheckedChange={(checked) =>
                setFilter(
                  "includePracticeRuns",
                  checked === true ? "true" : null
                )
              }
            />
            <label
              htmlFor="includePracticeRuns"
              className="text-sm text-muted-foreground"
            >
              Show practice runs (quick test results)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Config Stats - shown when filtering by configId */}
      {configId && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Performance Overview</CardTitle>
          </CardHeader>
          {configStatsLoading ? (
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading stats...
            </CardContent>
          ) : configStats &&
            (configStats.targetSummaries.length > 0 ||
              configStats.dailyScoresByTarget.length > 0) ? (
            <CardContent className="space-y-6">
              {/* Weekly Comparison Table */}
              {configStats.targetSummaries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    This Week vs Last Week
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Target</TableHead>
                          <TableHead className="text-right">
                            This Week Avg
                          </TableHead>
                          <TableHead className="text-right">
                            Last Week Avg
                          </TableHead>
                          <TableHead className="text-right">Change</TableHead>
                          <TableHead className="text-right">
                            This Week Tests
                          </TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configStats.targetSummaries.map((ts) => {
                          const thisWeekPct =
                            ts.thisWeek.avgScore !== null
                              ? toPercent(ts.thisWeek.avgScore).toFixed(1)
                              : "—";
                          const lastWeekPct =
                            ts.lastWeek.avgScore !== null
                              ? toPercent(ts.lastWeek.avgScore).toFixed(1)
                              : "—";
                          const changePct =
                            ts.change !== null ? ts.change.toFixed(1) : null;
                          const changeColor =
                            changePct === null
                              ? "text-muted-foreground"
                              : parseFloat(changePct) >= 0
                                ? "text-green-600"
                                : "text-red-600";
                          const failedRate =
                            ts.thisWeek.count > 0
                              ? (
                                  (ts.thisWeek.failedCount /
                                    ts.thisWeek.count) *
                                  100
                                ).toFixed(0)
                              : "0";

                          return (
                            <TableRow key={ts.target}>
                              <TableCell className="font-medium">
                                {ts.target}
                              </TableCell>
                              <TableCell className="text-right">
                                {thisWeekPct}%
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {lastWeekPct}%
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${changeColor}`}
                              >
                                {changePct !== null
                                  ? parseFloat(changePct) >= 0
                                    ? `+${changePct}`
                                    : changePct
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {ts.thisWeek.count}
                              </TableCell>
                              <TableCell className="text-right">
                                {ts.thisWeek.failedCount > 0 ? (
                                  <span className="text-destructive">
                                    {ts.thisWeek.failedCount} ({failedRate}%)
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    0
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Score Over Time Chart */}
              {configStats.dailyScoresByTarget.length > 0 &&
                (() => {
                  const targets = [
                    ...new Set(
                      configStats.dailyScoresByTarget.map((d) => d.target)
                    ),
                  ];
                  const dates = [
                    ...new Set(
                      configStats.dailyScoresByTarget.map((d) => d.date)
                    ),
                  ].sort();
                  const colors = [
                    "rgb(37, 99, 235)",
                    "rgb(220, 38, 38)",
                    "rgb(22, 163, 74)",
                    "rgb(234, 88, 12)",
                    "rgb(139, 92, 246)",
                    "rgb(14, 165, 233)",
                    "rgb(244, 63, 94)",
                  ];

                  const datasets = targets.map((target, i) => {
                    const targetData = configStats.dailyScoresByTarget.filter(
                      (d) => d.target === target
                    );
                    const dataByDate = new Map(
                      targetData.map((d) => [d.date, toPercent(d.avgScore)])
                    );
                    return {
                      label: target,
                      data: dates.map((date) => dataByDate.get(date) ?? null),
                      borderColor: colors[i % colors.length],
                      backgroundColor: colors[i % colors.length]
                        .replace("rgb", "rgba")
                        .replace(")", ", 0.1)"),
                      tension: 0.25,
                      spanGaps: true,
                    };
                  });

                  return (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">
                        Score Trend by Target (Last 30 Days)
                      </h3>
                      <div className="h-64">
                        <Line
                          data={{ labels: dates, datasets }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: "bottom",
                                labels: { boxWidth: 12, padding: 15 },
                              },
                              tooltip: {
                                callbacks: {
                                  label: (ctx) =>
                                    `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
                                },
                              },
                            },
                            scales: {
                              y: {
                                min: 0,
                                max: 100,
                                ticks: {
                                  callback: (value) =>
                                    `${Number(value).toFixed(0)}%`,
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
            </CardContent>
          ) : (
            <CardContent className="py-8 text-center text-muted-foreground">
              No performance data available for this config yet.
            </CardContent>
          )}
        </Card>
      )}

      {/* Runs DataTable */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            table={table}
            columnCount={columns.length}
            isLoading={loading}
            emptyMessage={
              hasActiveFilters
                ? "No runs match the current filters."
                : "No benchmark runs found."
            }
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
                {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const columns: ColumnDef<Run>[] = [
  {
    accessorKey: "id",
    header: "Run",
    cell: ({ row }) => (
      <Link
        to={`/runs/${row.original.id}`}
        className="font-mono text-xs text-primary hover:text-primary/80 block truncate"
        title={row.original.id}
      >
        {row.original.id}
      </Link>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "configName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Config
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { configName, configId, configSnapshot, metadata } = row.original;
      const runner = (configSnapshot as Record<string, unknown>)?.runner as
        | string
        | undefined;
      const scorer = (configSnapshot as Record<string, unknown>)?.scorer as
        | { type: string }
        | undefined;

      return (
        <div className="space-y-1">
          {configName ? (
            <Link
              to={`/configs/${configId}`}
              className="text-sm hover:text-primary truncate max-w-[200px] block"
              title={configName}
            >
              {configName}
            </Link>
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <TriggerSourceBadge
              metadata={metadata as TriggerMetadata | undefined}
            />
            {runner && (
              <span className="text-xs font-medium text-purple-700">
                {runner}
              </span>
            )}
            {scorer && (
              <span className="text-xs font-medium text-green-700">
                {scorer.type}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <StatusBadge
        status={
          row.original.status as
            | "pending"
            | "running"
            | "completed"
            | "failed"
            | "partial"
        }
      />
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.completedTestCases} / {row.original.totalTestCases}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "avgScore",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Avg Score
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <ScoreBadge score={row.original.avgScore} size="sm" />,
  },
  {
    accessorKey: "totalDurationMs",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Duration
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const ms = row.original.totalDurationMs;
      if (!ms) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-sm text-muted-foreground">
          {(ms / 1000).toFixed(1)}s
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {new Date(row.original.createdAt).toLocaleString()}
      </span>
    ),
  },
];
