import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  useConfigs,
  useExecuteQuickTest,
  useQuickTestStatus,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function QuickTest() {
  const [selectedConfigIds, setSelectedConfigIds] = useState<Set<string>>(
    new Set()
  );
  const [runs, setRuns] = useState<QuickTestRun[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(true);

  const [endpointOverride, setEndpointOverride] = useState("");
  const [maxTestCases, setMaxTestCases] = useState<string>("");

  const { data: configsData, isLoading: loading } = useConfigs({
    favoritesOnly: showOnlyFavorites,
    limit: 100,
  });
  const configs = configsData?.configs ?? [];

  const executeQuickTestMutation = useExecuteQuickTest();

  const activeRunIds = runs
    .filter(
      (r) =>
        r.status === "created" ||
        r.status === "running" ||
        r.status === "pending"
    )
    .map((r) => r.runId)
    .filter(Boolean);

  const { data: statusData } = useQuickTestStatus(activeRunIds, {
    enabled: activeRunIds.length > 0,
    refetchInterval: activeRunIds.length > 0 ? 2000 : undefined,
  });

  useEffect(() => {
    if (showOnlyFavorites && configs.length > 0) {
      setSelectedConfigIds(new Set(configs.map((c) => c.id)));
    }
  }, [showOnlyFavorites, configs]);

  useEffect(() => {
    if (statusData?.statuses) {
      setRuns((prev) =>
        prev.map((run) => {
          const status = statusData.statuses.find((s) => s.runId === run.runId);
          if (status) {
            return {
              ...run,
              status: status.status,
              completedTestCases: status.completedTestCases,
              totalTestCases: status.totalTestCases,
              avgScore: status.avgScore,
            };
          }
          return run;
        })
      );
    }
  }, [statusData]);

  const toggleConfig = (id: string) => {
    setSelectedConfigIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedConfigIds(new Set(configs.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedConfigIds(new Set());
  };

  const executeQuickTest = () => {
    if (selectedConfigIds.size === 0) {
      toastError(
        new Error("No configs selected"),
        "Select at least one config"
      );
      return;
    }

    const options: {
      maxTestCasesPerConfig?: number;
      endpointBaseOverride?: string;
    } = {};

    if (maxTestCases && parseInt(maxTestCases, 10) > 0) {
      options.maxTestCasesPerConfig = parseInt(maxTestCases, 10);
    }
    if (endpointOverride.trim()) {
      options.endpointBaseOverride = endpointOverride.trim();
    }

    executeQuickTestMutation.mutate(
      {
        configIds: Array.from(selectedConfigIds),
        options: Object.keys(options).length > 0 ? options : undefined,
      },
      {
        onSuccess: (result) => {
          setRuns(result.runs);
          toastSuccess(`Started ${result.runs.length} quick test runs`);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      created: "bg-blue-100 text-blue-700",
      pending: "bg-blue-100 text-blue-700",
      running: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      partial: "bg-orange-100 text-orange-700",
      failed: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quick Test</h1>
        <p className="text-sm text-muted-foreground">
          Validate new Mastra deployments by running E2E tests on selected
          configs
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold">Test Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Endpoint Override (optional)
              </label>
              <Input
                type="text"
                value={endpointOverride}
                onChange={(e) => setEndpointOverride(e.target.value)}
                placeholder="https://pr-123.api.renisa.ai"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Replace the base URL in all target endpoints (paths are
                preserved)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Max Test Cases per Config (optional)
              </label>
              <Input
                type="number"
                value={maxTestCases}
                onChange={(e) => setMaxTestCases(e.target.value)}
                placeholder="Leave empty for all"
                min={1}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Limit to first N test cases for faster validation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox id="practiceRunNote" checked disabled />
            <label
              htmlFor="practiceRunNote"
              className="text-sm text-muted-foreground"
            >
              Results marked as practice runs (filtered from normal views)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              Select Configs ({selectedConfigIds.size} selected)
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showOnlyFavorites}
                  onCheckedChange={(checked) =>
                    setShowOnlyFavorites(checked === true)
                  }
                />
                Show only favorites
              </label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading configs...
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No {showOnlyFavorites ? "favorite " : ""}configs found.</p>
              {showOnlyFavorites && (
                <p className="mt-1 text-sm">
                  <Link
                    to="/configs"
                    className="text-primary hover:text-primary/80"
                  >
                    Mark some configs as favorites
                  </Link>{" "}
                  or uncheck "Show only favorites"
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {configs.map((config) => {
                const runner = (config.configJson as Record<string, unknown>)
                  ?.runner as string | undefined;
                return (
                  <label
                    key={config.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedConfigIds.has(config.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedConfigIds.has(config.id)}
                      onCheckedChange={() => toggleConfig(config.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {config.isFavorite && (
                          <svg
                            className="w-4 h-4 text-yellow-500 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                        <span className="font-medium truncate">
                          {config.name}
                        </span>
                      </div>
                      {runner && (
                        <span className="text-xs text-muted-foreground">
                          {runner}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <Button
              onClick={executeQuickTest}
              disabled={
                executeQuickTestMutation.isPending ||
                selectedConfigIds.size === 0
              }
            >
              {executeQuickTestMutation.isPending
                ? "Starting..."
                : `Run ${selectedConfigIds.size} Config${selectedConfigIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {runs.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4">Quick Test Runs</h2>
            <div className="space-y-2">
              {runs.map((run) => (
                <div
                  key={run.runId || run.configId}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{run.configName}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(run.status)}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {run.totalTestCases !== undefined && (
                      <span>
                        {run.completedTestCases || 0}/{run.totalTestCases} tests
                      </span>
                    )}
                    {run.avgScore !== undefined && run.avgScore !== null && (
                      <span className="font-medium">
                        Avg: {(run.avgScore * 100).toFixed(1)}%
                      </span>
                    )}
                    {run.runId && (
                      <Link
                        to={`/runs/${run.runId}`}
                        className="text-primary hover:text-primary/80"
                      >
                        View Details
                      </Link>
                    )}
                    {run.error && (
                      <span className="text-destructive" title={run.error}>
                        Error
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type QuickTestRun = {
  configId: string;
  configName: string;
  runId: string;
  status: string;
  completedTestCases?: number;
  totalTestCases?: number;
  avgScore?: number | null;
  error?: string;
};
