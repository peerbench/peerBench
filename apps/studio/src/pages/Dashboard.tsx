import { useState } from "react";
import { Link } from "react-router-dom";
import { type ConfigDashboardSummary, type ConfigStats } from "@/lib/api";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AgentName } from "@/components/AgentName";
import { formatTimeAgo } from "@/lib/format-utils";
import {
  Activity,
  XCircle,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useDashboardStats, useConfigStats } from "@/lib/queries";

const TARGET_COLORS = [
  "rgb(37, 99, 235)",
  "rgb(16, 185, 129)",
  "rgb(245, 158, 11)",
  "rgb(239, 68, 68)",
  "rgb(139, 92, 246)",
  "rgb(236, 72, 153)",
  "rgb(20, 184, 166)",
  "rgb(249, 115, 22)",
];

export function Dashboard() {
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDashboardStats();
  const { data: configStats, isLoading: configStatsLoading } = useConfigStats(
    expandedConfigId ?? "",
    { days: 30 },
    { enabled: !!expandedConfigId }
  );

  const handleConfigClick = (configId: string) => {
    if (expandedConfigId === configId) {
      setExpandedConfigId(null);
    } else {
      setExpandedConfigId(configId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (isError) {
    return <div className="text-center py-8">Failed to load dashboard.</div>;
  }

  if (!data) return null;

  const { operationalStats, configSummaries } = data;

  const runsDelta =
    operationalStats.runsLastWeek > 0
      ? ((operationalStats.runsThisWeek - operationalStats.runsLastWeek) /
          operationalStats.runsLastWeek) *
        100
      : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Runs This Week"
          value={operationalStats.runsThisWeek}
          change={runsDelta}
          changeLabel="vs last week"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Failed"
          value={operationalStats.failedRunsThisWeek}
          icon={<XCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Partial"
          value={operationalStats.partialRunsThisWeek}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Regressions"
          value={operationalStats.regressionsDetected}
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Configurations</CardTitle>
        </CardHeader>
        {configSummaries.length > 0 ? (
          <CardContent className="p-0">
            <div className="divide-y">
              {configSummaries.map((config) => (
                <div key={config.configId}>
                  <ConfigRow
                    config={config}
                    isExpanded={expandedConfigId === config.configId}
                    onClick={() => handleConfigClick(config.configId)}
                  />
                  {expandedConfigId === config.configId && (
                    <ConfigDrillDown
                      config={config}
                      configStats={configStats ?? null}
                      loading={configStatsLoading}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        ) : (
          <CardContent className="text-center text-muted-foreground py-8">
            <p>No configurations found.</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function ConfigRow({ config, isExpanded, onClick }: ConfigRowProps) {
  const groupId = config.initialConfigId ?? config.configId;

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
        isExpanded ? "bg-muted/50" : ""
      }`}
      onClick={onClick}
      data-testid={`config-row-${config.configId}`}
      data-group-id={groupId}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/configs/${config.configId}`}
            className="font-medium text-sm text-blue-600 hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {config.configName}
          </Link>
          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
            v{config.configVersion}
          </span>
          {config.tags.map((tag) => (
            <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {config.isRegressed && (
            <span
              className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium"
              data-testid="regression-indicator"
            >
              Regression
            </span>
          )}
        </div>
        {config.targetBreakdown.length > 1 && (
          <div className="flex items-center gap-3 mt-1">
            {config.targetBreakdown.map((t) => (
              <span key={t.target} className="text-xs text-muted-foreground">
                <AgentName
                  name={t.target}
                  wrapInTooltip={false}
                  className="text-xs"
                />
                : <ScoreBadge score={t.avgScore} size="sm" />
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0" data-testid="sparkline">
        {(() => {
          const scores = config.sparkline.map((p) => p.score ?? 0);
          const trending =
            scores.length >= 2 ? scores[scores.length - 1] >= scores[0] : true;
          return trending ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          );
        })()}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <ScoreBadge score={config.lastRunScore} size="sm" />
        {config.lastRunStatus && (
          <StatusBadge
            status={
              config.lastRunStatus as
                | "completed"
                | "failed"
                | "running"
                | "pending"
                | "partial"
            }
            size="sm"
          />
        )}
        <span className="text-xs text-muted-foreground w-16 text-right">
          {formatTimeAgo(config.lastRunAt)}
        </span>
      </div>
    </div>
  );
}

function ConfigDrillDown({
  config,
  configStats,
  loading,
}: ConfigDrillDownProps) {
  if (loading) {
    return (
      <div className="px-6 py-8 bg-muted/30 text-center text-sm text-muted-foreground">
        Loading config stats...
      </div>
    );
  }

  if (!configStats) {
    return (
      <div className="px-6 py-8 bg-muted/30 text-center text-sm text-muted-foreground">
        No data available.
      </div>
    );
  }

  const { dailyScoresByTarget, targetSummaries, overallStats } = configStats;

  const targetGroups = new Map<string, typeof dailyScoresByTarget>();
  for (const point of dailyScoresByTarget) {
    if (!targetGroups.has(point.target)) {
      targetGroups.set(point.target, []);
    }
    targetGroups.get(point.target)!.push(point);
  }

  const allDates = [...new Set(dailyScoresByTarget.map((p) => p.date))].sort();
  const targets = [...targetGroups.keys()];

  const toPercent = (score: number) => (score > 1 ? score : score * 100);

  const chartData = {
    labels: allDates,
    datasets: targets.map((target, i) => {
      const points = targetGroups.get(target)!;
      const dateMap = new Map(points.map((p) => [p.date, p.avgScore]));
      return {
        label: target,
        data: allDates.map((d) => {
          const val = dateMap.get(d);
          return val !== undefined ? toPercent(val) : null;
        }),
        borderColor: TARGET_COLORS[i % TARGET_COLORS.length],
        backgroundColor: "transparent",
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
        spanGaps: true,
      };
    }),
  };

  return (
    <div
      className="px-6 py-4 bg-muted/30 space-y-4"
      data-testid="config-drilldown"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {config.configName} — Last 30 Days
        </h4>
        <div className="text-xs text-muted-foreground">
          {overallStats.completedRuns} / {overallStats.totalRuns} runs completed
          {overallStats.avgScore !== null && (
            <> · Avg: {toPercent(overallStats.avgScore).toFixed(1)}%</>
          )}
        </div>
      </div>

      {allDates.length > 0 && (
        <div className="h-48">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: targets.length > 1,
                  position: "bottom",
                  labels: { boxWidth: 12, font: { size: 11 } },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const value = ctx.parsed.y;
                      if (value === null) return "";
                      return `${ctx.dataset.label}: ${value.toFixed(1)}%`;
                    },
                  },
                },
              },
              scales: {
                y: {
                  suggestedMin: 0,
                  suggestedMax: 100,
                  ticks: {
                    callback: (value) => `${Number(value).toFixed(0)}%`,
                  },
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 0,
                    maxTicksLimit: 10,
                  },
                },
              },
              interaction: {
                intersect: false,
                mode: "index" as const,
              },
            }}
          />
        </div>
      )}

      {targetSummaries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium text-right">This Week</th>
                <th className="pb-2 font-medium text-right">Last Week</th>
                <th className="pb-2 font-medium text-right">Change</th>
                <th className="pb-2 font-medium text-right">Results</th>
              </tr>
            </thead>
            <tbody>
              {targetSummaries.map((ts) => (
                <tr key={ts.target} className="border-b last:border-0">
                  <td className="py-2 font-medium">
                    <AgentName name={ts.target} wrapInTooltip={false} />
                  </td>
                  <td className="py-2 text-right">
                    <ScoreBadge score={ts.thisWeek.avgScore} size="sm" />
                  </td>
                  <td className="py-2 text-right">
                    <ScoreBadge score={ts.lastWeek.avgScore} size="sm" />
                  </td>
                  <td className="py-2 text-right">
                    {ts.change !== null ? (
                      <span
                        className={`text-xs font-medium ${
                          ts.change > 0
                            ? "text-green-600"
                            : ts.change < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {ts.change > 0 ? "+" : ""}
                        {(ts.change * 100).toFixed(1)}pp
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {ts.thisWeek.count}
                    {ts.thisWeek.failedCount > 0 && (
                      <span className="text-red-600 ml-1">
                        ({ts.thisWeek.failedCount} failed)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ConfigRowProps {
  config: ConfigDashboardSummary;
  isExpanded: boolean;
  onClick: () => void;
}

interface ConfigDrillDownProps {
  config: ConfigDashboardSummary;
  configStats: ConfigStats | null;
  loading: boolean;
}
