/**
 * Database layer barrel re-export
 *
 * This file re-exports all functions and types from the individual
 * function modules in the ./functions/ directory and types from ./types.ts.
 *
 * Consumer files import from this file (e.g., `from "../lib/db"`) for
 * backward compatibility.
 *
 * IMPORTANT: Many functions use adapter wrappers to maintain backward
 * compatibility with the old positional-parameter API. The internal
 * implementations use parameter objects for transaction support.
 */

import type { Config, Trigger, Run } from "@prisma/client";

// ============ Types ============
export type {
  Agent,
  Config,
  Run,
  Result,
  Trigger,
  LangfuseTrigger,
  LangfusePromptVersion,
  HealthCheckResult,
  AgentWithHealthCheck,
  ConfigWithFailedCount,
  ResultListRow,
  ResultExplorerRow,
  ResultDetail,
  ConfigTargetDailyScore,
  ConfigTargetSummary,
  ConfigStats,
  LeaderboardEntry,
  RunnerLeaderboard,
  LeaderboardFilters,
  LeaderboardFilterParams,
  ConfigDashboardSummary,
  DashboardOperationalStats,
  ConfigDashboardData,
  Feedback,
  FeedbackWithContext,
  FeedbackStats,
} from "./types";

import type {
  AgentWithHealthCheck,
  HealthCheckResult,
  LangfuseTrigger,
  ResultDetail,
  ConfigStats,
  ConfigDashboardData,
} from "./types";

// ============ Internal imports for adapters ============
import { getAgent as _getAgent } from "./functions/agents/get-agent";
import { deleteAgent as _deleteAgent } from "./functions/agents/delete-agent";
import { importMastraAgents as _importMastraAgents } from "./functions/agents/import-mastra-agents";
import { getConfig as _getConfig } from "./functions/configs/get-config";
import { deleteConfig as _deleteConfig } from "./functions/configs/delete-config";
import { toggleConfigFavorite as _toggleConfigFavorite } from "./functions/configs/toggle-config-favorite";
import { incrementRunCount as _incrementRunCount } from "./functions/configs/increment-run-count";
import { duplicateConfig as _duplicateConfig } from "./functions/configs/duplicate-config";
import { getConfigVersions as _getConfigVersions } from "./functions/configs/get-config-versions";
import { findOrCreateConfig as _findOrCreateConfig } from "./functions/configs/find-or-create-config";
import { updateConfig as _updateConfig } from "./functions/configs/update-config";
import { getRun as _getRun } from "./functions/runs/get-run";
import { getDailyScores as _getDailyScores } from "./functions/runs/get-daily-scores";
import { updateRunStatus as _updateRunStatus } from "./functions/run-execution/update-run-status";
import { getResultById as _getResultById } from "./functions/results/get-result-by-id";
import { getTrigger as _getTrigger } from "./functions/triggers/get-trigger";
import { deleteTrigger as _deleteTrigger } from "./functions/triggers/delete-trigger";
import { claimTrigger as _claimTrigger } from "./functions/triggers/claim-trigger";
import { updateTrigger as _updateTrigger } from "./functions/triggers/update-trigger";
import { updateTriggerAfterRun as _updateTriggerAfterRun } from "./functions/triggers/update-trigger-after-run";
import { getRecentRunForConfig as _getRecentRunForConfig } from "./functions/triggers/get-recent-run-for-config";
import { getLangfuseTrigger as _getLangfuseTrigger } from "./functions/langfuse-triggers/get-langfuse-trigger";
import { deleteLangfuseTrigger as _deleteLangfuseTrigger } from "./functions/langfuse-triggers/delete-langfuse-trigger";
import { updateLangfuseTrigger as _updateLangfuseTrigger } from "./functions/langfuse-triggers/update-langfuse-trigger";
import { getEnabledLangfuseTriggersByPrompt as _getEnabledLangfuseTriggersByPrompt } from "./functions/langfuse-triggers/get-enabled-langfuse-triggers-by-prompt";
import { updateLangfuseTriggerAfterRun as _updateLangfuseTriggerAfterRun } from "./functions/langfuse-triggers/update-langfuse-trigger-after-run";
import { updateLangfuseTriggerLastSeen as _updateLangfuseTriggerLastSeen } from "./functions/langfuse-triggers/update-langfuse-trigger-last-seen";
import { updateLangfuseTriggerRunStatus as _updateLangfuseTriggerRunStatus } from "./functions/langfuse-triggers/update-langfuse-trigger-run-status";
import { getAgentMetrics as _getAgentMetrics } from "./functions/agent-metrics/get-agent-metrics";
import { getAgentDailyPerformance as _getAgentDailyPerformance } from "./functions/agent-metrics/get-agent-daily-performance";
import { getAgentRunPerformance as _getAgentRunPerformance } from "./functions/agent-metrics/get-agent-run-performance";
import { getAgentOverview as _getAgentOverview } from "./functions/agent-metrics/get-agent-overview";
import { getConfigStats as _getConfigStats } from "./functions/config-stats/get-config-stats";
import { getConfigDashboardSummaries as _getConfigDashboardSummaries } from "./functions/dashboard/get-config-dashboard-summaries";
import { performHealthCheckForAgent as _performHealthCheckForAgent } from "./functions/health-checks/perform-health-check-for-agent";
import { performHealthCheckForAgents as _performHealthCheckForAgents } from "./functions/health-checks/perform-health-check-for-agents";

// ============ Agents ============
export { listAgents } from "./functions/agents/list-agents";
export { createAgent } from "./functions/agents/create-agent";
export { findOrCreateAgent } from "./functions/agents/find-or-create-agent";
export { ensureAgentsFromConfig } from "./functions/agents/ensure-agents-from-config";

// Adapter: getAgent(id) -> _getAgent({ id })
export async function getAgent(
  id: string
): Promise<AgentWithHealthCheck | null> {
  return _getAgent({ id });
}

// Adapter: deleteAgent(id) -> _deleteAgent({ id })
export async function deleteAgent(id: string): Promise<void> {
  return _deleteAgent({ id });
}

// Adapter: importMastraAgents(baseUrl) -> _importMastraAgents({ baseUrl })
export async function importMastraAgents(
  baseUrl: string
): Promise<{ imported: number; agents: AgentWithHealthCheck[] }> {
  return _importMastraAgents({ baseUrl }) as Promise<{
    imported: number;
    agents: AgentWithHealthCheck[];
  }>;
}

// ============ Configs ============
export { findConfigByHash } from "./functions/configs/find-config-by-hash";
export { listConfigs } from "./functions/configs/list-configs";
export { createConfig } from "./functions/configs/create-config";

// Adapter: getConfig(id) -> _getConfig({ id })
export async function getConfig(id: string): Promise<Config | null> {
  return _getConfig({ id });
}

// Adapter: deleteConfig(id) -> _deleteConfig({ id })
export async function deleteConfig(id: string): Promise<void> {
  return _deleteConfig({ id });
}

// Adapter: toggleConfigFavorite(id) -> _toggleConfigFavorite({ id })
export async function toggleConfigFavorite(id: string): Promise<Config | null> {
  return _toggleConfigFavorite({ id });
}

// Adapter: incrementRunCount(id) -> _incrementRunCount({ id })
export async function incrementRunCount(id: string): Promise<void> {
  return _incrementRunCount({ id });
}

// Adapter: duplicateConfig(id, newName) -> _duplicateConfig({ id, newName })
export async function duplicateConfig(
  id: string,
  newName: string
): Promise<Config | null> {
  return _duplicateConfig({ id, newName });
}

// Adapter: getConfigVersions(configId) -> _getConfigVersions({ configId })
export async function getConfigVersions(configId: string): Promise<Config[]> {
  return _getConfigVersions({ configId });
}

// Adapter: findOrCreateConfig(configJson) -> _findOrCreateConfig({ configJson })
export async function findOrCreateConfig(
  configJson: Record<string, unknown>
): Promise<{ config: Config; created: boolean }> {
  return _findOrCreateConfig({ configJson });
}

// Adapter: updateConfig(id, data) -> _updateConfig({ id, ...data })
export async function updateConfig(
  id: string,
  data: {
    name?: string;
    description?: string;
    configJson?: Record<string, unknown>;
    tags?: string[];
  }
): Promise<Config | null> {
  return _updateConfig({ id, ...data });
}

// ============ Runs ============
export { listRuns } from "./functions/runs/list-runs";
export { getRunFilterOptions } from "./functions/runs/get-run-filter-options";
export { createRun } from "./functions/runs/create-run";
export { getRunStats } from "./functions/runs/get-run-stats";

// Adapter: getRun(id) -> _getRun({ id })
export async function getRun(id: string): Promise<Run | null> {
  return _getRun({ id });
}

// Adapter: getDailyScores(days) -> _getDailyScores({ days })
export async function getDailyScores(days = 30): Promise<
  Array<{
    date: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    count: number;
  }>
> {
  return _getDailyScores({ days });
}

// ============ Results ============
export { listResults } from "./functions/results/list-results";
export { listAllResults } from "./functions/results/list-all-results";
export { getResultFilterOptions } from "./functions/results/get-result-filter-options";

// Adapter: getResultById(id) -> _getResultById({ id })
export async function getResultById(id: string): Promise<ResultDetail | null> {
  return _getResultById({ id });
}

// ============ Run Execution ============
export { markInProgressRunsAsPartial } from "./functions/run-execution/mark-in-progress-runs-as-partial";
export { createResult } from "./functions/run-execution/create-result";

// Adapter: updateRunStatus(id, data) -> _updateRunStatus({ id, ...data })
export async function updateRunStatus(
  id: string,
  data: {
    status?: string;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    totalTestCases?: number;
    completedTestCases?: number;
    successfulTestCases?: number;
    failedTestCases?: number;
    avgScore?: number;
    minScore?: number;
    maxScore?: number;
    totalDurationMs?: number;
  }
): Promise<Run | null> {
  return _updateRunStatus({ id, ...data });
}

// ============ Agent Metrics ============
export { listAgentConfigPerformance } from "./functions/agent-metrics/list-agent-config-performance";
export { listAgentConfigTestCasePerformance } from "./functions/agent-metrics/list-agent-config-test-case-performance";
export { findAgentForExecution } from "./functions/agent-metrics/find-agent-for-execution";

// Adapter: getAgentMetrics() -> _getAgentMetrics({})
// Note: Return type matches extracted function (agentProvider, agentEndpointUrl, runCount)
export async function getAgentMetrics(): Promise<
  Array<{
    agentId: string;
    agentName: string;
    agentProvider: string;
    agentEndpointUrl: string;
    runCount: number;
    avgScore: number | null;
    lastRunAt: Date | null;
  }>
> {
  return _getAgentMetrics({});
}

// Adapter: getAgentDailyPerformance(agentId, days, configId, configVersion)
export async function getAgentDailyPerformance(
  agentId: string,
  days = 30,
  configId?: string | null,
  configVersion?: number | null
): Promise<
  Array<{
    date: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    count: number;
    scoredCount: number;
  }>
> {
  return _getAgentDailyPerformance({ agentId, days, configId, configVersion });
}

// Adapter: getAgentRunPerformance(agentId, days, configId, configVersion)
// Note: Return type matches extracted function (resultCount instead of count, no configId/configVersion)
export async function getAgentRunPerformance(
  agentId: string,
  days = 30,
  configId?: string | null,
  configVersion?: number | null
): Promise<
  Array<{
    runId: string;
    timestamp: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    resultCount: number;
    scoredCount: number;
    configName: string | null;
  }>
> {
  return _getAgentRunPerformance({ agentId, days, configId, configVersion });
}

// Adapter: getAgentOverview(agentId) -> _getAgentOverview({ agentId })
export async function getAgentOverview(agentId: string): Promise<{
  runCount: number;
  resultCount: number;
  scoredCount: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  lastRunAt: Date | null;
}> {
  return _getAgentOverview({ agentId });
}

// ============ Triggers ============
export { listTriggers } from "./functions/triggers/list-triggers";
export { createTrigger } from "./functions/triggers/create-trigger";
export { getDueTriggers } from "./functions/triggers/get-due-triggers";
export { getTriggersWithConfigs } from "./functions/triggers/get-triggers-with-configs";

// Adapter: getTrigger(id) -> _getTrigger({ id })
export async function getTrigger(id: string): Promise<Trigger | null> {
  return _getTrigger({ id });
}

// Adapter: deleteTrigger(id) -> _deleteTrigger({ id })
export async function deleteTrigger(id: string): Promise<void> {
  return _deleteTrigger({ id });
}

// Adapter: claimTrigger(id) -> _claimTrigger({ id })
export async function claimTrigger(
  id: string
): Promise<{ trigger: Trigger; config: Config } | null> {
  return _claimTrigger({ id });
}

// Adapter: updateTrigger(id, data) -> _updateTrigger({ id, ...data })
export async function updateTrigger(
  id: string,
  data: {
    name?: string;
    configId?: string;
    intervalSeconds?: number;
    enabled?: boolean;
    skipIfRecentRunSeconds?: number | null;
  }
): Promise<Trigger | null> {
  return _updateTrigger({ id, ...data });
}

// Adapter: updateTriggerAfterRun(id, { runId, status }) -> _updateTriggerAfterRun({ id, runId, status })
export async function updateTriggerAfterRun(
  id: string,
  data: { runId: string; status: "completed" | "failed" }
): Promise<void> {
  return _updateTriggerAfterRun({ id, runId: data.runId, status: data.status });
}

// Adapter: getRecentRunForConfig(configId, withinSeconds) -> _getRecentRunForConfig({ configId, withinSeconds })
export async function getRecentRunForConfig(
  configId: string,
  withinSeconds: number
): Promise<Run | null> {
  return _getRecentRunForConfig({ configId, withinSeconds });
}

// ============ Langfuse Triggers ============
export { listLangfuseTriggers } from "./functions/langfuse-triggers/list-langfuse-triggers";
export { createLangfuseTrigger } from "./functions/langfuse-triggers/create-langfuse-trigger";
export { getLangfuseTriggersWithConfigs } from "./functions/langfuse-triggers/get-langfuse-triggers-with-configs";

// Adapter: getLangfuseTrigger(id) -> _getLangfuseTrigger({ id })
export async function getLangfuseTrigger(
  id: string
): Promise<LangfuseTrigger | null> {
  return _getLangfuseTrigger({ id });
}

// Adapter: deleteLangfuseTrigger(id) -> _deleteLangfuseTrigger({ id })
export async function deleteLangfuseTrigger(id: string): Promise<void> {
  return _deleteLangfuseTrigger({ id });
}

// Adapter: updateLangfuseTrigger(id, data) -> _updateLangfuseTrigger({ id, ...data })
export async function updateLangfuseTrigger(
  id: string,
  data: {
    name?: string;
    promptName?: string;
    configId?: string;
    enabled?: boolean;
    debounceSeconds?: number;
  }
): Promise<LangfuseTrigger | null> {
  return _updateLangfuseTrigger({ id, ...data });
}

// Adapter: getEnabledLangfuseTriggersByPrompt(promptName)
export async function getEnabledLangfuseTriggersByPrompt(
  promptName: string
): Promise<LangfuseTrigger[]> {
  return _getEnabledLangfuseTriggersByPrompt({ promptName });
}

// Adapter: updateLangfuseTriggerAfterRun(id, { lastTriggeredAt, lastTriggeredVersion, lastRunId, lastRunStatus })
export async function updateLangfuseTriggerAfterRun(
  id: string,
  data: {
    lastTriggeredAt: Date;
    lastTriggeredVersion: number;
    lastRunId: string;
    lastRunStatus: string;
  }
): Promise<void> {
  return _updateLangfuseTriggerAfterRun({
    id,
    lastTriggeredAt: data.lastTriggeredAt,
    lastTriggeredVersion: data.lastTriggeredVersion,
    lastRunId: data.lastRunId,
    lastRunStatus: data.lastRunStatus,
  });
}

// Adapter: updateLangfuseTriggerLastSeen(id, version) -> _updateLangfuseTriggerLastSeen({ id, version })
export async function updateLangfuseTriggerLastSeen(
  id: string,
  version: number
): Promise<void> {
  return _updateLangfuseTriggerLastSeen({ id, version });
}

// Adapter: updateLangfuseTriggerRunStatus(id, { lastRunStatus }) -> _updateLangfuseTriggerRunStatus({ id, lastRunStatus })
export async function updateLangfuseTriggerRunStatus(
  id: string,
  data: { lastRunStatus: string }
): Promise<void> {
  return _updateLangfuseTriggerRunStatus({
    id,
    lastRunStatus: data.lastRunStatus,
  });
}

// ============ Prompt Versions ============
export { getHighestPromptVersion } from "./functions/prompt-versions/get-highest-prompt-version";
export { getAllHighestPromptVersions } from "./functions/prompt-versions/get-all-highest-prompt-versions";
export { addPromptVersion } from "./functions/prompt-versions/add-prompt-version";
export { getPromptVersion } from "./functions/prompt-versions/get-prompt-version";
export { listPromptVersions } from "./functions/prompt-versions/list-prompt-versions";
export { getWatchedPromptNames } from "./functions/prompt-versions/get-watched-prompt-names";

// ============ Config Stats ============
export { getComparisonData } from "./functions/config-stats/get-comparison-data";
export { getComparisonTimeSeries } from "./functions/config-stats/get-comparison-time-series";

// Adapter: getConfigStats(configId, days) -> _getConfigStats({ configId, days })
export async function getConfigStats(
  configId: string,
  days = 30
): Promise<ConfigStats> {
  return _getConfigStats({ configId, days });
}

// ============ Leaderboard ============
export { getLeaderboardFilters } from "./functions/leaderboard/get-leaderboard-filters";
export { getFilteredLeaderboard } from "./functions/leaderboard/get-filtered-leaderboard";
export { getLeaderboard } from "./functions/leaderboard/get-leaderboard";

// ============ Health Checks ============
export { resolveAgentIdsFromConfigTargets } from "./functions/health-checks/resolve-agent-ids-from-config-targets";

// Adapter: performHealthCheckForAgent(agentId) -> _performHealthCheckForAgent({ agentId })
export async function performHealthCheckForAgent(
  agentId: string
): Promise<HealthCheckResult> {
  return _performHealthCheckForAgent({ agentId });
}

// Adapter: performHealthCheckForAgents(agentIds, runId?) -> _performHealthCheckForAgents({ agentIds, runId })
export async function performHealthCheckForAgents(
  agentIds: string[],
  runId?: string
): Promise<HealthCheckResult[]> {
  return _performHealthCheckForAgents({ agentIds, runId });
}

// ============ Dashboard ============
// Adapter: getConfigDashboardSummaries() -> _getConfigDashboardSummaries({})
export async function getConfigDashboardSummaries(): Promise<ConfigDashboardData> {
  return _getConfigDashboardSummaries({});
}

// ============ Feedback ============
export { createFeedback } from "./functions/feedback/create-feedback";
export { getFeedbackByResult } from "./functions/feedback/get-feedback-by-result";
export { listFeedback } from "./functions/feedback/list-feedback";
export { getFeedbackStats } from "./functions/feedback/get-feedback-stats";

// ============ Supabase Discovery Cache ============
export { getCachedDiscovery } from "./functions/supabase-discovery/get-cached-discovery";
export { upsertDiscovery } from "./functions/supabase-discovery/upsert-discovery";
