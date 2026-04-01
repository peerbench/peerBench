import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import {
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimeAgo } from "@/lib/format-utils";
import { useFeedbackList, useFeedbackStats } from "@/lib/queries";

const PAGE_SIZE = 25;
const RECENT_LIMIT = 10;

function getTrendsChartData(
  trends: Array<{ date: string; positiveCount: number; negativeCount: number }>,
  granularity: "daily" | "weekly"
) {
  if (granularity === "daily") {
    return {
      labels: trends.map((t) => t.date),
      datasets: [
        {
          label: "Positive",
          data: trends.map((t) => t.positiveCount),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.3,
        },
        {
          label: "Negative",
          data: trends.map((t) => t.negativeCount),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.3,
        },
      ],
    };
  }

  const weeklyMap = new Map<string, { positive: number; negative: number }>();
  for (const t of trends) {
    const date = new Date(t.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    const existing = weeklyMap.get(weekKey) || { positive: 0, negative: 0 };
    weeklyMap.set(weekKey, {
      positive: existing.positive + t.positiveCount,
      negative: existing.negative + t.negativeCount,
    });
  }

  const weeks = Array.from(weeklyMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  return {
    labels: weeks.map(([week]) => `Week of ${week}`),
    datasets: [
      {
        label: "Positive",
        data: weeks.map(([, data]) => data.positive),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.3,
      },
      {
        label: "Negative",
        data: weeks.map(([, data]) => data.negative),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.3,
      },
    ],
  };
}

export function FeedbackAdminSection() {
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [configFilter, setConfigFilter] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<
    "positive" | "negative" | null
  >(null);
  const [daysFilter, setDaysFilter] = useState(30);
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");

  const limit = showAll ? PAGE_SIZE : RECENT_LIMIT;
  const offset = showAll ? (page - 1) * PAGE_SIZE : 0;

  const feedbackQuery = useFeedbackList({
    configId: configFilter || undefined,
    sentiment: sentimentFilter || undefined,
    days: daysFilter,
    limit,
    offset,
  });

  const statsQuery = useFeedbackStats({ days: daysFilter });

  const items = feedbackQuery.data?.items ?? [];
  const total = feedbackQuery.data?.total ?? 0;
  const stats = statsQuery.data ?? null;
  const loading = feedbackQuery.isLoading;
  const statsLoading = statsQuery.isLoading;

  const configOptions =
    stats?.sentimentByConfig.map((c) => ({
      value: c.configId,
      label: c.configName,
    })) || [];

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Feedback</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <ThumbsUp className="h-4 w-4" />
                {stats?.totalPositive ?? 0}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <ThumbsDown className="h-4 w-4" />
                {stats?.totalNegative ?? 0}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <FilterSelect
              label="Config"
              value={configFilter || undefined}
              onValueChange={(v) => {
                setConfigFilter(v);
                setPage(1);
                setShowAll(false);
              }}
              placeholder="All Configs"
              options={configOptions}
            />
            <FilterSelect
              label="Sentiment"
              value={sentimentFilter || undefined}
              onValueChange={(v) => {
                setSentimentFilter(v as "positive" | "negative" | null);
                setPage(1);
                setShowAll(false);
              }}
              placeholder="All"
              options={[
                { value: "positive", label: "Positive" },
                { value: "negative", label: "Negative" },
              ]}
            />
            <FilterSelect
              label="Time Range"
              value={String(daysFilter)}
              onValueChange={(v) => {
                setDaysFilter(v ? Number(v) : 30);
                setPage(1);
                setShowAll(false);
              }}
              placeholder="30 days"
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "14", label: "Last 14 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {showAll ? `All Feedback (${total})` : `Recent Feedback`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No feedback submitted yet.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Sentiment</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead className="w-[120px]">When</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <Fragment key={item.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(item.id)}
                      >
                        <TableCell>
                          {item.sentiment === "positive" ? (
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {item.configName || "Unknown Config"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatTimeAgo(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          {expandedRowId === item.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRowId === item.id && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={4} className="p-4">
                            <div className="space-y-3">
                              <div>
                                <span className="text-sm font-medium">
                                  Comment:
                                </span>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.comment || "No comment"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-6">
                                <div>
                                  <span className="text-sm font-medium">
                                    Submitted by:
                                  </span>
                                  <span className="text-sm ml-2">
                                    {item.name}
                                  </span>
                                </div>
                                {item.scoreValue !== null && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      Score:
                                    </span>
                                    <ScoreBadge score={item.scoreValue} />
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-4">
                                <Link
                                  to={`/runs/${item.runId}/results/${item.resultId}`}
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Result{" "}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                                {item.configId && (
                                  <Link
                                    to={`/configs/${item.configId}`}
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View Config{" "}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-medium">
                                  Config Context:
                                </span>
                                <div className="mt-1 bg-background rounded border p-2 max-h-48 overflow-auto">
                                  <JsonView
                                    data={{
                                      runner: item.runner,
                                      scorer: item.scorer,
                                    }}
                                    style={defaultStyles}
                                  />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>

              {!showAll ? (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAll(true);
                      setPage(1);
                    }}
                  >
                    Load All ({total})
                  </Button>
                </div>
              ) : (
                totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" /> Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment by Config</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : !stats || stats.sentimentByConfig.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data
              </div>
            ) : (
              <div className="h-64">
                <Bar
                  data={{
                    labels: stats.sentimentByConfig.map((c) => c.configName),
                    datasets: [
                      {
                        label: "Positive",
                        data: stats.sentimentByConfig.map(
                          (c) => c.positiveCount
                        ),
                        backgroundColor: "#22c55e",
                      },
                      {
                        label: "Negative",
                        data: stats.sentimentByConfig.map(
                          (c) => c.negativeCount
                        ),
                        backgroundColor: "#ef4444",
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true },
                    },
                    plugins: {
                      legend: { position: "bottom" },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Feedback Trends</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={granularity === "daily" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGranularity("daily")}
                >
                  Daily
                </Button>
                <Button
                  variant={granularity === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGranularity("weekly")}
                >
                  Weekly
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : !stats || stats.trendsOverTime.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data
              </div>
            ) : (
              <div className="h-64">
                <Line
                  data={getTrendsChartData(stats.trendsOverTime, granularity)}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom" },
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
