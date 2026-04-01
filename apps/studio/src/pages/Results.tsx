import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye } from "lucide-react";
import { type ResultExplorerRow } from "@/lib/api";
import { useResults, useResultFilterOptions } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { AgentName } from "@/components/AgentName";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/FilterSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 50;

export function Results() {
  const { searchParams, setFilter, clearAllFilters, goToPage } =
    useUrlFilters();
  const [sorting, setSorting] = useState<SortingState>([]);
  const navigate = useNavigate();

  const configId = searchParams.get("configId") || undefined;
  const configName = searchParams.get("configName") || undefined;
  const testCaseId = searchParams.get("testCaseId") || undefined;
  const resultId = searchParams.get("resultId") || undefined;
  const runId = searchParams.get("runId") || undefined;
  const agentId = searchParams.get("agentId") || undefined;
  const status = searchParams.get("status") || undefined;
  const runner = searchParams.get("runner") || undefined;
  const scorer = searchParams.get("scorer") || undefined;
  const scoreMinRaw = searchParams.get("scoreMin");
  const scoreMaxRaw = searchParams.get("scoreMax");
  const scoreMin = scoreMinRaw !== null ? parseFloat(scoreMinRaw) : undefined;
  const scoreMax = scoreMaxRaw !== null ? parseFloat(scoreMaxRaw) : undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: filterOptions } = useResultFilterOptions();

  const resultsParams = {
    configId,
    configName,
    testCaseId,
    resultId,
    runId,
    agentId,
    status,
    runner,
    scorer,
    scoreMin: scoreMin !== undefined && !isNaN(scoreMin) ? scoreMin : undefined,
    scoreMax: scoreMax !== undefined && !isNaN(scoreMax) ? scoreMax : undefined,
    limit: PAGE_SIZE,
    offset,
  };
  const { data: resultsData, isLoading: loading } = useResults(resultsParams);
  const results = resultsData?.results ?? [];
  const total = resultsData?.total ?? 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFilterCount = [
    configId,
    configName,
    testCaseId,
    resultId,
    runId,
    agentId,
    status,
    runner,
    scorer,
    scoreMinRaw,
    scoreMaxRaw,
  ].filter(Boolean).length;

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results Explorer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse all test case results across runs
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {total.toLocaleString()} result{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Filters</h2>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all ({activeFilterCount})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <FilterSelect
            label="Config"
            value={configId}
            onValueChange={(v) => setFilter("configId", v)}
            placeholder="All configs"
            options={
              filterOptions?.configs.map((c) => ({
                value: c.id,
                label: c.name,
              })) || []
            }
            triggerClassName="h-8 text-xs"
            labelClassName="text-xs text-gray-500"
          />

          <FilterSelect
            label="Agent"
            value={agentId}
            onValueChange={(v) => setFilter("agentId", v)}
            placeholder="All agents"
            options={
              filterOptions?.agents.map((a) => ({
                value: a.id,
                label: a.name,
              })) || []
            }
            triggerClassName="h-8 text-xs"
            labelClassName="text-xs text-gray-500"
          />

          <FilterSelect
            label="Status"
            value={status}
            onValueChange={(v) => setFilter("status", v)}
            placeholder="All statuses"
            options={filterOptions?.statuses || []}
            triggerClassName="h-8 text-xs"
            labelClassName="text-xs text-gray-500"
          />

          <FilterSelect
            label="Runner"
            value={runner}
            onValueChange={(v) => setFilter("runner", v)}
            placeholder="All runners"
            options={filterOptions?.runners || []}
            triggerClassName="h-8 text-xs"
            labelClassName="text-xs text-gray-500"
          />

          <FilterSelect
            label="Scorer"
            value={scorer}
            onValueChange={(v) => setFilter("scorer", v)}
            placeholder="All scorers"
            options={filterOptions?.scorers || []}
            triggerClassName="h-8 text-xs"
            labelClassName="text-xs text-gray-500"
          />

          {/* Score Min */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Score min</label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="e.g. 0.5"
              className="h-8 text-xs"
              value={scoreMinRaw ?? ""}
              onChange={(e) => setFilter("scoreMin", e.target.value || null)}
            />
          </div>

          {/* Score Max */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Score max</label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="e.g. 0.8"
              className="h-8 text-xs"
              value={scoreMaxRaw ?? ""}
              onChange={(e) => setFilter("scoreMax", e.target.value || null)}
            />
          </div>

          {/* Test Case ID */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Test Case ID</label>
            <Input
              placeholder="Search..."
              className="h-8 text-xs"
              value={testCaseId ?? ""}
              onChange={(e) => setFilter("testCaseId", e.target.value || null)}
            />
          </div>

          {/* Result ID */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Result ID</label>
            <Input
              placeholder="Exact match..."
              className="h-8 text-xs"
              value={resultId ?? ""}
              onChange={(e) => setFilter("resultId", e.target.value || null)}
            />
          </div>

          {/* Run ID */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Run ID</label>
            <Input
              placeholder="Exact match..."
              className="h-8 text-xs"
              value={runId ?? ""}
              onChange={(e) => setFilter("runId", e.target.value || null)}
            />
          </div>

          {/* Config Name */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Config Name</label>
            <Input
              placeholder="Search..."
              className="h-8 text-xs"
              value={configName ?? ""}
              onChange={(e) => setFilter("configName", e.target.value || null)}
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No results found.</p>
            {activeFilterCount > 0 && (
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={clearAllFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/runs/${row.original.runId}/results/${row.original.id}`
                        )
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
          </>
        )}
      </div>
    </div>
  );
}

const columns: ColumnDef<ResultExplorerRow>[] = [
  {
    id: "view",
    header: "",
    cell: ({ row }) => (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={`/runs/${row.original.runId}/results/${row.original.id}`}
              className="inline-flex cursor-pointer text-gray-400 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>View details</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    enableSorting: false,
    size: 40,
  },
  {
    accessorKey: "runId",
    header: "Run",
    cell: ({ row }) => (
      <Link
        to={`/runs/${row.original.runId}`}
        className="font-mono text-xs text-primary hover:text-primary/80 block truncate"
        title={row.original.runId}
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.runId}
      </Link>
    ),
    enableSorting: false,
    size: 120,
    maxSize: 160,
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
      const { configId, configName } = row.original;
      if (configId && configName) {
        return (
          <Link
            to={`/configs/${configId}`}
            className="text-xs text-primary hover:text-primary/80 max-w-[140px] truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {configName}
          </Link>
        );
      }
      return (
        <span className="text-xs text-gray-500 max-w-[140px] truncate block">
          {configName || "—"}
        </span>
      );
    },
  },
  {
    id: "target",
    header: "Target",
    cell: ({ row }) => {
      if (row.original.modelSlug) {
        return (
          <AgentName
            name={row.original.modelSlug}
            provider={row.original.agentProvider}
            endpointUrl={row.original.agentEndpointUrl}
          />
        );
      }
      return <span className="text-gray-400">—</span>;
    },
    enableSorting: false,
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
        status={row.original.status as "success" | "failed" | "partial"}
        size="sm"
      />
    ),
  },
  {
    accessorKey: "scoreValue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Score
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.original.scoreValue;
      if (score === null || score === undefined) {
        return <span className="text-sm text-gray-400">—</span>;
      }
      return <ScoreBadge score={score} size="sm" />;
    },
  },
  {
    accessorKey: "durationMs",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Duration / TTFT
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { durationMs, ttftMs } = row.original;
      if (!durationMs) {
        return <span className="text-sm text-gray-500">—</span>;
      }
      return (
        <div className="flex flex-col text-sm text-gray-500">
          <span>{durationMs}ms</span>
          {ttftMs != null && (
            <span className="text-xs text-gray-400">TTFT: {ttftMs}ms</span>
          )}
        </div>
      );
    },
  },
  {
    id: "tokens",
    header: "Tokens (In/Out)",
    cell: ({ row }) => {
      const { inputTokensUsed, outputTokensUsed } = row.original;
      if (!inputTokensUsed && !outputTokensUsed) {
        return <span className="text-sm text-gray-500">—</span>;
      }
      return (
        <span className="text-sm text-gray-500">
          {inputTokensUsed || 0} / {outputTokensUsed || 0}
        </span>
      );
    },
    enableSorting: false,
  },
];
