import { useState } from "react";
import { Link } from "react-router-dom";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useLeaderboardFilters, useFilteredLeaderboard } from "@/lib/queries";
import type { LeaderboardEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterSelect } from "@/components/ui/FilterSelect";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatScore,
  formatDate,
  formatDuration,
  getScoreColor,
} from "@/lib/format-utils";
import { AgentName } from "@/components/AgentName";

function getRankBadge(rank: number): string {
  if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (rank === 2) return "bg-muted text-muted-foreground border-border";
  if (rank === 3) return "bg-orange-100 text-orange-700 border-orange-300";
  return "bg-muted/50 text-muted-foreground border-border";
}

function getEntryKey(entry: LeaderboardEntry): string {
  if (entry.systemPromptId != null) {
    return `${entry.agentId}::${entry.systemPromptId}::${entry.systemPromptVersion ?? ""}`;
  }
  return entry.agentId;
}

function LeaderboardTable({
  entries,
  compareMode,
  selectedAgents,
  onToggleAgent,
  groupByPromptVersion,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {compareMode && (
              <TableHead className="w-12 text-center">Compare</TableHead>
            )}
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Target</TableHead>
            {groupByPromptVersion && <TableHead>Prompt</TableHead>}
            <TableHead className="text-right">Avg Score</TableHead>
            <TableHead className="text-right">Min / Max</TableHead>
            <TableHead className="text-right">Runs</TableHead>
            <TableHead className="text-right">Results</TableHead>
            <TableHead className="text-right">Scored</TableHead>
            <TableHead className="text-right">Avg Duration</TableHead>
            <TableHead className="text-right">TTFT</TableHead>
            <TableHead className="text-right">Last Run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={getEntryKey(entry)}
              className={selectedAgents.has(entry.agentId) ? "bg-blue-50" : ""}
            >
              {compareMode && (
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedAgents.has(entry.agentId)}
                    onCheckedChange={() => onToggleAgent(entry.agentId)}
                  />
                </TableCell>
              )}
              <TableCell>
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border ${getRankBadge(entry.rank)}`}
                >
                  {entry.rank}
                </span>
              </TableCell>
              <TableCell>
                <Link
                  to={`/agents?search=${encodeURIComponent(entry.agentName)}`}
                  className="font-medium hover:text-primary"
                >
                  <AgentName
                    name={entry.agentName}
                    provider={entry.agentProvider}
                  />
                </Link>
              </TableCell>
              {groupByPromptVersion && (
                <TableCell>
                  {entry.systemPromptId ? (
                    <div>
                      <div className="text-sm font-medium">
                        {entry.systemPromptId}
                      </div>
                      {entry.systemPromptVersion != null && (
                        <div className="text-xs text-muted-foreground">
                          v{entry.systemPromptVersion}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No prompt data
                    </span>
                  )}
                </TableCell>
              )}
              <TableCell
                className={`text-right font-mono ${getScoreColor(entry.avgScore)}`}
              >
                {formatScore(entry.avgScore)}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground font-mono">
                {formatScore(entry.minScore)} / {formatScore(entry.maxScore)}
              </TableCell>
              <TableCell className="text-right text-sm">
                {entry.runCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm">
                {entry.resultCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm">
                {entry.scoredCount.toLocaleString()}
                {entry.resultCount > 0 && (
                  <span className="text-muted-foreground ml-1">
                    (
                    {((entry.scoredCount / entry.resultCount) * 100).toFixed(0)}
                    %)
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">
                {formatDuration(entry.avgDurationMs)}
                {entry.minDurationMs !== null &&
                  entry.maxDurationMs !== null && (
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(entry.minDurationMs)} -{" "}
                      {formatDuration(entry.maxDurationMs)}
                    </div>
                  )}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">
                {formatDuration(entry.avgTtftMs)}
                {entry.ttftCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {entry.ttftCount} samples
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatDate(entry.lastRunAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function Leaderboard() {
  const {
    searchParams,
    setSearchParams,
    setFilter: updateParam,
    clearAllFilters,
  } = useUrlFilters({ resetPageOnChange: false });

  const { data: filters, isLoading: filtersLoading } = useLeaderboardFilters();

  const tagsParam = searchParams.get("tags");
  const selectedTags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const tagMode = (searchParams.get("tagMode") as "and" | "or") || "or";
  const runner = searchParams.get("runner") || "";
  const scorer = searchParams.get("scorer") || "";
  const daysParam = searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : undefined;
  const minutesParam = searchParams.get("minutes");
  const minutes = minutesParam ? parseInt(minutesParam, 10) : undefined;
  const configId = searchParams.get("configId") || "";
  const provider = searchParams.get("provider") || "";
  const minResultsParam = searchParams.get("minResults");
  const minResults = minResultsParam
    ? parseInt(minResultsParam, 10)
    : undefined;
  const compareAgentsParam = searchParams.get("compareAgents");
  const compareAgents = compareAgentsParam
    ? compareAgentsParam.split(",").filter(Boolean)
    : [];
  const groupByPromptVersion =
    searchParams.get("groupByPromptVersion") === "true";

  const getTimeFilterValue = () => {
    if (minutes) return `m${minutes}`;
    if (days) return `d${days}`;
    return "__all__";
  };

  const handleTimeFilterChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("days");
    newParams.delete("minutes");
    if (value.startsWith("m")) {
      newParams.set("minutes", value.slice(1));
    } else if (value.startsWith("d")) {
      newParams.set("days", value.slice(1));
    }
    setSearchParams(newParams);
  };

  const [compareMode, setCompareMode] = useState(false);
  const [selectedAgentsForCompare, setSelectedAgentsForCompare] = useState<
    Set<string>
  >(new Set(compareAgents));

  const updateTags = (tags: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (tags.length > 0) {
      newParams.set("tags", tags.join(","));
    } else {
      newParams.delete("tags");
    }
    setSearchParams(newParams);
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    updateTags(newTags);
  };

  const clearAllAndResetCompare = () => {
    clearAllFilters();
    setSelectedAgentsForCompare(new Set());
  };

  const toggleAgentForCompare = (agentId: string) => {
    setSelectedAgentsForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const applyComparison = () => {
    if (selectedAgentsForCompare.size >= 2) {
      updateParam(
        "compareAgents",
        Array.from(selectedAgentsForCompare).join(",")
      );
    }
  };

  const clearComparison = () => {
    setSelectedAgentsForCompare(new Set());
    updateParam("compareAgents", undefined);
  };

  const leaderboardParams = {
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    tagMode: selectedTags.length > 0 ? tagMode : undefined,
    runner: runner || undefined,
    scorer: scorer || undefined,
    days,
    minutes,
    configId: configId || undefined,
    provider: provider || undefined,
    minResults,
    compareAgents: compareAgents.length >= 2 ? compareAgents : undefined,
    groupByPromptVersion: groupByPromptVersion || undefined,
  };
  const { data: leaderboardData, isLoading: loading } =
    useFilteredLeaderboard(leaderboardParams);
  const entries = leaderboardData?.entries ?? [];

  const totalResults = entries.reduce((sum, e) => sum + e.resultCount, 0);
  const activeFilterCount =
    (selectedTags.length > 0 ? 1 : 0) +
    (runner ? 1 : 0) +
    (scorer ? 1 : 0) +
    (days || minutes ? 1 : 0) +
    (configId ? 1 : 0) +
    (provider ? 1 : 0) +
    (minResults ? 1 : 0) +
    (compareAgents.length >= 2 ? 1 : 0) +
    (groupByPromptVersion ? 1 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Target accuracy rankings. Filter and compare agents across different
          dimensions.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filters</h2>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllAndResetCompare}
              >
                Clear all ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">
                Time Range
              </label>
              <Select
                value={getTimeFilterValue()}
                onValueChange={handleTimeFilterChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Time</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Minutes</SelectLabel>
                    <SelectItem value="m5">Last 5 min</SelectItem>
                    <SelectItem value="m10">Last 10 min</SelectItem>
                    <SelectItem value="m30">Last 30 min</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Hours</SelectLabel>
                    <SelectItem value="m60">Last 1 hour</SelectItem>
                    <SelectItem value="m180">Last 3 hours</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Days</SelectLabel>
                    <SelectItem value="d7">Last 7 days</SelectItem>
                    <SelectItem value="d30">Last 30 days</SelectItem>
                    <SelectItem value="d90">Last 90 days</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <FilterSelect
              label="Runner"
              value={runner || undefined}
              onValueChange={(v) => updateParam("runner", v)}
              placeholder="All Runners"
              options={filters?.runners || []}
              triggerClassName="w-[180px]"
              labelClassName="block text-sm font-medium mb-1"
              disabled={filtersLoading}
            />

            <FilterSelect
              label="Scorer"
              value={scorer || undefined}
              onValueChange={(v) => updateParam("scorer", v)}
              placeholder="All Scorers"
              options={filters?.scorers || []}
              triggerClassName="w-[180px]"
              labelClassName="block text-sm font-medium mb-1"
              disabled={filtersLoading}
            />

            <FilterSelect
              label="Provider"
              value={provider || undefined}
              onValueChange={(v) => updateParam("provider", v)}
              placeholder="All Providers"
              options={filters?.providers || []}
              triggerClassName="w-[150px]"
              labelClassName="block text-sm font-medium mb-1"
              disabled={filtersLoading}
            />

            <FilterSelect
              label="Config"
              value={configId || undefined}
              onValueChange={(v) => updateParam("configId", v)}
              placeholder="All Configs"
              options={
                filters?.configs.map((c) => ({
                  value: c.id,
                  label: c.name,
                })) || []
              }
              triggerClassName="w-[200px]"
              labelClassName="block text-sm font-medium mb-1"
              disabled={filtersLoading}
            />

            <div>
              <label className="block text-sm font-medium mb-1">
                Min Results
              </label>
              <Input
                type="number"
                value={minResults ?? ""}
                onChange={(e) =>
                  updateParam(
                    "minResults",
                    e.target.value ? e.target.value : undefined
                  )
                }
                placeholder="0"
                className="w-24"
              />
            </div>
          </div>

          {filters && filters.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <label className="text-sm font-medium">Tags</label>
                {selectedTags.length > 0 && (
                  <>
                    <div className="flex items-center gap-1 text-xs">
                      <Button
                        variant={tagMode === "or" ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => updateParam("tagMode", "or")}
                      >
                        OR
                      </Button>
                      <Button
                        variant={tagMode === "and" ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => updateParam("tagMode", "and")}
                      >
                        AND
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => updateTags([])}
                    >
                      Clear tags
                    </Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.tags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    className="h-7 rounded-full"
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={groupByPromptVersion}
                  onCheckedChange={(checked) =>
                    updateParam(
                      "groupByPromptVersion",
                      checked === true ? "true" : undefined
                    )
                  }
                />
                Group by Prompt Version
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={compareMode}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setCompareMode(isChecked);
                    if (!isChecked) {
                      clearComparison();
                    }
                  }}
                />
                Head-to-Head Comparison Mode
              </label>
              {compareMode && (
                <span className="text-xs text-muted-foreground">
                  Select 2+ agents to compare on common test cases only
                </span>
              )}
            </div>

            {compareMode && selectedAgentsForCompare.size > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedAgentsForCompare).map((agentId) => {
                    const agent = filters?.agents.find((a) => a.id === agentId);
                    return (
                      <span
                        key={agentId}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        <AgentName
                          name={agent?.name || agentId.slice(0, 8)}
                          provider={agent?.provider}
                          wrapInTooltip={false}
                        />
                        <button
                          onClick={() => toggleAgentForCompare(agentId)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
                {selectedAgentsForCompare.size >= 2 && (
                  <Button size="sm" onClick={applyComparison}>
                    Compare ({selectedAgentsForCompare.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearComparison}>
                  Clear selection
                </Button>
              </div>
            )}

            {compareAgents.length >= 2 && (
              <div className="mt-2 px-3 py-2 bg-blue-50 rounded text-sm text-blue-700">
                Showing results for test cases where all {compareAgents.length}{" "}
                selected agents have results (fair comparison).
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Targets</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Total Runs</div>
            <div className="text-2xl font-bold">
              {entries.reduce((sum, e) => sum + e.runCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Total Results</div>
            <div className="text-2xl font-bold">
              {totalResults.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading leaderboard...
          </div>
        ) : (
          <LeaderboardTable
            entries={entries}
            compareMode={compareMode}
            selectedAgents={selectedAgentsForCompare}
            onToggleAgent={toggleAgentForCompare}
            groupByPromptVersion={groupByPromptVersion}
          />
        )}
      </Card>
    </div>
  );
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  compareMode: boolean;
  selectedAgents: Set<string>;
  onToggleAgent: (agentId: string) => void;
  groupByPromptVersion: boolean;
}
