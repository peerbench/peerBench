import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatTimeAgo } from "@/lib/format-utils";
import {
  useAgent,
  useAgentOverview,
  useAgentConfigPerformance,
  useAgentTestCasePerformance,
  useAgentHealthCheck,
} from "@/lib/queries";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Button } from "@/components/ui/button";
import { AgentName } from "@/components/AgentName";

export function AgentDetail() {
  const params = useParams();
  const agentId = params.id;

  const [selectedConfigId, setSelectedConfigId] = useState<
    string | null | undefined
  >(undefined);

  const { data: agent, isLoading: loadingAgent } = useAgent(agentId ?? "", {
    enabled: !!agentId,
  });
  const { data: overview, isLoading: loadingOverview } = useAgentOverview(
    agentId ?? "",
    { enabled: !!agentId }
  );
  const { data: configPerformance, isLoading: loadingConfigs } =
    useAgentConfigPerformance(
      agentId ?? "",
      { limit: 50 },
      { enabled: !!agentId }
    );
  const byConfig = configPerformance?.rows ?? [];
  const loading = loadingAgent || loadingOverview || loadingConfigs;

  const { data: testCasePerformance, isLoading: loadingTestCases } =
    useAgentTestCasePerformance(
      agentId ?? "",
      { configId: selectedConfigId, limit: 200 },
      { enabled: !!agentId && selectedConfigId !== undefined }
    );
  const byTestCase = testCasePerformance?.rows ?? [];

  const healthCheckMutation = useAgentHealthCheck();

  const handleCheckHealth = () => {
    if (!agentId) return;
    healthCheckMutation.mutate(agentId);
  };

  const selectedConfigLabel = useMemo(() => {
    if (selectedConfigId === undefined) return "Select a config";
    if (selectedConfigId === null) return "Ad-hoc (no config)";
    const cfg = byConfig.find((c) => c.configId === selectedConfigId);
    return cfg?.configName ?? selectedConfigId;
  }, [byConfig, selectedConfigId]);

  if (loading) return <div className="text-center py-8">Loading…</div>;
  if (!agentId) return <div className="text-center py-8">Agent not found.</div>;
  if (!agent || !overview) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <AgentName
            name={agent.name || agent.agentId}
            provider={agent.provider}
            endpointUrl={agent.endpointUrl}
            as="h1"
            className="text-2xl font-bold text-gray-900 truncate"
          />
          <p className="text-sm text-gray-500">
            {agent.provider}
            {agent.endpointUrl ? ` • ${agent.endpointUrl}` : ""}
          </p>
          {agent.description ? (
            <p className="text-sm text-gray-700 mt-2">{agent.description}</p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/agents">Back →</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Runs</p>
          <p className="text-2xl font-bold text-gray-900">
            {overview.runCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Results</p>
          <p className="text-2xl font-bold text-gray-900">
            {overview.resultCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {overview.scoredCount} scored
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="text-2xl font-bold text-gray-900">
            <ScoreBadge score={overview.avgScore} size="md" />
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Last Result</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {overview.lastRunAt
              ? new Date(overview.lastRunAt).toLocaleString()
              : "—"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Health</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleCheckHealth}
              disabled={healthCheckMutation.isPending}
            >
              {healthCheckMutation.isPending ? "Checking..." : "Check Now"}
            </Button>
          </div>
          {agent.lastHealthCheck ? (
            <>
              <p
                className={`text-lg font-bold mt-1 ${agent.lastHealthCheck.status === "healthy" ? "text-green-600" : "text-red-600"}`}
              >
                {agent.lastHealthCheck.status === "healthy"
                  ? "Healthy"
                  : "Unhealthy"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatTimeAgo(agent.lastHealthCheck.checkedAt)}
                {agent.lastHealthCheck.responseTimeMs !== null &&
                  ` • ${agent.lastHealthCheck.responseTimeMs}ms`}
              </p>
              {agent.lastHealthCheck.checkedPath && (
                <p className="text-xs text-gray-400 font-mono truncate">
                  {agent.lastHealthCheck.checkedPath}
                </p>
              )}
              {agent.lastHealthCheck.errorMessage && (
                <p
                  className="text-xs text-red-500 mt-1 truncate"
                  title={agent.lastHealthCheck.errorMessage}
                >
                  {agent.lastHealthCheck.errorMessage}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-1">Never checked</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Performance by Config</h2>
          <p className="text-xs text-gray-500">
            Click a config to view test cases
          </p>
        </div>
        {byConfig.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Config
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Runs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Results
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Result
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byConfig.map((row) => {
                  const isSelected = row.configId === selectedConfigId;
                  const label = row.configId
                    ? (row.configName ?? row.configId)
                    : "Ad-hoc (no config)";

                  return (
                    <tr
                      key={row.configId ?? "none"}
                      className={`hover:bg-gray-50 cursor-pointer ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedConfigId(row.configId)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.configId ? (
                          <Link
                            to={`/configs/${row.configId}`}
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.runCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.resultCount}
                        <span className="text-xs text-gray-400 ml-2">
                          ({row.scoredCount} scored)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={row.avgScore} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.lastRunAt
                          ? new Date(row.lastRunAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No results for this agent yet.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Performance by Test Case</h2>
          <p className="text-xs text-gray-500">{selectedConfigLabel}</p>
        </div>

        {selectedConfigId === undefined ? (
          <div className="p-8 text-center text-gray-500">
            <p>Select a config above to see test case performance.</p>
          </div>
        ) : loadingTestCases ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : byTestCase.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Test Case
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Runs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Results
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Result
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byTestCase.map((row) => {
                  const label = row.testCaseName
                    ? row.testCaseName
                    : `${row.testCaseId.slice(0, 12)}…`;

                  return (
                    <tr key={`${row.configId ?? "none"}:${row.testCaseId}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {label}
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {row.testCaseId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.runCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.resultCount}
                        <span className="text-xs text-gray-400 ml-2">
                          ({row.scoredCount} scored)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={row.avgScore} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.lastRunAt
                          ? new Date(row.lastRunAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No test case results for this selection yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
