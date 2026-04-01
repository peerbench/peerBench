// Environment variable resolution:
// 1. Runtime env (Docker): window.__ENV__.VITE_API_URL (injected by docker-entrypoint.sh)
// 2. Build-time env (Vite): import.meta.env.VITE_API_URL
// 3. Default: empty string (uses relative URLs, goes through Vite proxy in dev)
declare global {
  interface Window {
    __ENV__?: {
      VITE_API_URL?: string;
    };
  }
}

const API_BASE =
  window.__ENV__?.VITE_API_URL || import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  validationErrors?: ValidationError[];

  constructor(message: string, validationErrors?: ValidationError[]) {
    super(message);
    this.name = "ApiError";
    this.validationErrors = validationErrors;
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    const message = errorBody.error || "API Error";
    const validationErrors = Array.isArray(errorBody.errors)
      ? errorBody.errors
      : undefined;
    throw new ApiError(message, validationErrors);
  }

  return res.json();
}

export interface ValidationError {
  path: string;
  message: string;
}

// Types
export interface HealthCheckResult {
  id: string;
  agentId: string;
  runId: string | null;
  status: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  checkedPath: string | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface Agent {
  id: string;
  agentId: string;
  name: string | null;
  provider: string;
  endpointUrl: string;
  description: string | null;
  metadata: Record<string, unknown>;
  lastHealthCheck: HealthCheckResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface Config {
  id: string;
  name: string;
  description: string | null;
  configJson: Record<string, unknown>;
  configHash: string;
  version: number;
  runCount: number;
  failedRunCount: number;
  tags: string[];
  isFavorite: boolean;
  createdBy: string | null;
  initialConfigId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  configId: string | null;
  configName: string | null;
  configSnapshot: Record<string, unknown>;
  status: string;
  totalTestCases: number;
  completedTestCases: number;
  successfulTestCases: number;
  failedTestCases: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  totalDurationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Result {
  id: string;
  runId: string;
  testCaseId: string;
  agentId: string | null;
  modelSlug: string | null;
  agentEndpointUrl: string | null;
  agentProvider: string | null;
  status: string;
  errorMessage: string | null;
  response: Record<string, unknown> | null;
  score: Record<string, unknown> | null;
  testCase: Record<string, unknown> | null;
  scoreValue: number | null;
  durationMs: number | null;
  ttftMs: number | null; // Time to first token (streaming only)
  inputTokensUsed: number | null;
  outputTokensUsed: number | null;
  createdAt: string;
}

export interface ResultExplorerRow extends Result {
  configId: string | null;
  configName: string | null;
  runner: string | null;
  scorer: string | null;
}

export interface ResultDetail extends ResultExplorerRow {
  startedAt: string | null;
  completedAt: string | null;
  systemPromptId: string | null;
  systemPromptVersion: number | null;
  systemPromptHash: string | null;
  inputCost: string | null;
  outputCost: string | null;
  pureTestCaseId: string | null;
  agentName: string | null;
}

export interface ResultFilterOptions {
  statuses: string[];
  runners: string[];
  scorers: string[];
  agents: Array<{ id: string; name: string }>;
  configs: Array<{ id: string; name: string }>;
}

export interface Feedback {
  id: string;
  runResultId: string;
  sentiment: "positive" | "negative";
  comment: string | null;
  name: string;
  userId: string | null;
  createdAt: string;
}

export interface FeedbackWithContext {
  id: string;
  resultId: string;
  runId: string;
  sentiment: "positive" | "negative";
  comment: string | null;
  name: string;
  userId: string | null;
  createdAt: string;
  configId: string | null;
  configName: string | null;
  runner: string | null;
  scorer: string | null;
  scoreValue: number | null;
}

export interface FeedbackStats {
  sentimentByConfig: Array<{
    configId: string;
    configName: string;
    positiveCount: number;
    negativeCount: number;
    totalCount: number;
  }>;
  trendsOverTime: Array<{
    date: string;
    positiveCount: number;
    negativeCount: number;
  }>;
  totalPositive: number;
  totalNegative: number;
}

export interface ListFeedbackResponse {
  items: FeedbackWithContext[];
  total: number;
}

export interface TestCase {
  id: string;
  schemaKind: string;
  name: string | null;
  data: Record<string, unknown>;
  description: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseSchema {
  id: string;
  kind: string;
  namespace: string;
  version: string;
  jsonSchema: Record<string, unknown>;
  description: string | null;
  createdAt: string;
}

export interface SchemaFieldDef {
  type: string;
  required?: boolean;
  description?: string;
  values?: string[];
  items?: Record<string, SchemaFieldDef>;
}

export interface SchemaSetMeta {
  id: string;
  kind: string;
  name: string;
  description: string;
  version: number;
  testCaseFields: string[];
  testCaseSchema?: Record<string, SchemaFieldDef>;
  responseSchema?: Record<string, SchemaFieldDef>;
  scoreSchema?: Record<string, SchemaFieldDef>;
}

export interface RunnerMeta {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  schemaSet: string;
  configSchema: Record<
    string,
    { type: string; required: boolean; description: string }
  >;
  exampleConfig: Record<string, unknown>;
}

export interface ScorerMeta {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  requiresProvider: boolean;
  outputSchema?: Record<string, { type: string; description: string }>;
}

export interface BenchmarkMeta {
  schemaSets: SchemaSetMeta[];
  runners: RunnerMeta[];
  scorers: ScorerMeta[];
}

export interface ConfigDashboardSummary {
  configId: string;
  configName: string;
  configVersion: number;
  initialConfigId: string | null;
  tags: string[];
  isFavorite: boolean;
  lastRunId: string | null;
  lastRunStatus: string | null;
  lastRunScore: number | null;
  lastRunTotalTestCases: number | null;
  lastRunCompletedTestCases: number | null;
  lastRunAt: string | null;
  runsThisWeek: number;
  failedRunsThisWeek: number;
  isRegressed: boolean;
  sparkline: Array<{
    runId: string;
    score: number | null;
    status: string;
    createdAt: string;
  }>;
  targetBreakdown: Array<{
    target: string;
    avgScore: number | null;
    resultCount: number;
    failedCount: number;
  }>;
}

export interface DashboardOperationalStats {
  activeConfigs: number;
  totalConfigs: number;
  runsThisWeek: number;
  runsLastWeek: number;
  failedRunsThisWeek: number;
  partialRunsThisWeek: number;
  regressionsDetected: number;
}

export interface ConfigDashboardData {
  operationalStats: DashboardOperationalStats;
  configSummaries: ConfigDashboardSummary[];
}

export interface AgentPerformancePoint {
  date: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
  count: number;
  scoredCount: number;
}

export interface AgentRunPerformancePoint {
  runId: string;
  timestamp: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
  resultCount: number;
  scoredCount: number;
  configName: string | null;
}

export interface AgentOverview {
  runCount: number;
  resultCount: number;
  scoredCount: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  lastRunAt: string | null;
}

export interface AgentConfigPerformanceRow {
  configId: string | null;
  configName: string | null;
  configVersion: number | null;
  runCount: number;
  resultCount: number;
  scoredCount: number;
  avgScore: number | null;
  lastRunAt: string | null;
}

export interface AgentConfigTestCasePerformanceRow {
  configId: string | null;
  testCaseId: string;
  testCaseName: string | null;
  runCount: number;
  resultCount: number;
  scoredCount: number;
  avgScore: number | null;
  lastRunAt: string | null;
}

export interface ConfigTargetDailyScore {
  date: string;
  target: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
  count: number;
  failedCount: number;
}

export interface ConfigTargetSummary {
  target: string;
  thisWeek: {
    avgScore: number | null;
    count: number;
    failedCount: number;
  };
  lastWeek: {
    avgScore: number | null;
    count: number;
    failedCount: number;
  };
  change: number | null;
}

export interface ConfigStats {
  dailyScoresByTarget: ConfigTargetDailyScore[];
  targetSummaries: ConfigTargetSummary[];
  overallStats: {
    totalRuns: number;
    completedRuns: number;
    avgScore: number | null;
  };
}

export interface LocalConfig {
  id: string;
  path: string;
  directory: string;
  name: string;
  config: Record<string, unknown>;
  hasTestCases: boolean;
  hasSystemPrompt: boolean;
  hasJudgePrompt: boolean;
}

export interface LocalConfigScanResult {
  directories: Array<{
    path: string;
    exists: boolean;
    configCount: number;
  }>;
  configs: LocalConfig[];
}

export interface LocalConfigDetail {
  name: string;
  path: string;
  directory: string;
  config: Record<string, unknown>;
}

export interface LocalConfigImportResult {
  message: string;
  config: Config;
}

export interface Trigger {
  id: string;
  name: string;
  configId: string;
  configName?: string;
  enabled: number; // 1 = true, 0 = false
  intervalSeconds: number;
  skipIfRecentRunSeconds: number | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunId: string | null;
  lastRunStatus: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerConfigOption {
  id: string;
  name: string;
}

export interface LangfuseTrigger {
  id: string;
  name: string;
  promptName: string;
  configId: string;
  configName?: string;
  enabled: number; // 1 = true, 0 = false
  debounceSeconds: number;
  lastSeenVersion: number | null;
  lastTriggeredAt: string | null;
  lastTriggeredVersion: number | null;
  lastRunId: string | null;
  lastRunStatus: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LangfusePromptOption {
  name: string;
  versions: number[];
  tags?: string[];
}

export interface LangfuseSyncResult {
  promptsChecked: number;
  newVersionsFound: number;
  triggersExecuted: number;
  errors: string[];
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentProvider: string;
  systemPromptId: string | null;
  systemPromptVersion: number | null;
  runCount: number;
  resultCount: number;
  scoredCount: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  avgDurationMs: number | null;
  minDurationMs: number | null;
  maxDurationMs: number | null;
  avgTtftMs: number | null;
  ttftCount: number;
  lastRunAt: string | null;
}

export interface RunnerLeaderboard {
  runner: string;
  entries: LeaderboardEntry[];
  totalRuns: number;
  totalResults: number;
}

export interface LeaderboardFilters {
  runners: string[];
  scorers: string[];
  tags: string[];
  providers: string[];
  agents: Array<{ id: string; name: string; provider: string }>;
  configs: Array<{ id: string; name: string }>;
}

export interface LeaderboardFilterParams {
  tags?: string[];
  tagMode?: "and" | "or";
  runner?: string;
  scorer?: string;
  days?: number;
  minutes?: number;
  configId?: string;
  provider?: string;
  agentId?: string;
  minResults?: number;
  compareAgents?: string[];
  groupByPromptVersion?: boolean;
}

// API functions
export const api = {
  // Benchmark Metadata
  getBenchmarkMeta: () => fetchApi<BenchmarkMeta>("/api/benchmark-meta"),

  // Stats
  getDashboardStats: () =>
    fetchApi<ConfigDashboardData>("/api/stats/dashboard"),
  getConfigStats: (configId: string, params?: { days?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set("days", String(params.days));
    const query = searchParams.toString();
    return fetchApi<ConfigStats>(
      `/api/stats/configs/${configId}${query ? `?${query}` : ""}`
    );
  },
  getAgentPerformance: (
    agentId: string,
    params?: { days?: number; configId?: string | null; configVersion?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set("days", String(params.days));
    if (params?.configId === null) searchParams.set("configId", "none");
    if (typeof params?.configId === "string")
      searchParams.set("configId", params.configId);
    if (params?.configVersion !== undefined)
      searchParams.set("configVersion", String(params.configVersion));
    const query = searchParams.toString();
    return fetchApi<AgentPerformancePoint[]>(
      `/api/stats/agents/${agentId}/performance${query ? `?${query}` : ""}`
    );
  },
  getAgentRunPerformance: (
    agentId: string,
    params?: { days?: number; configId?: string | null; configVersion?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set("days", String(params.days));
    if (params?.configId === null) searchParams.set("configId", "none");
    if (typeof params?.configId === "string")
      searchParams.set("configId", params.configId);
    if (params?.configVersion !== undefined)
      searchParams.set("configVersion", String(params.configVersion));
    const query = searchParams.toString();
    return fetchApi<AgentRunPerformancePoint[]>(
      `/api/stats/agents/${agentId}/runs-performance${query ? `?${query}` : ""}`
    );
  },
  getAgentOverview: (agentId: string) =>
    fetchApi<AgentOverview>(`/api/stats/agents/${agentId}/overview`),
  getComparisonData: (params: {
    agentIds: string[];
    configIds: string[];
    days?: number;
  }) => {
    const searchParams = new URLSearchParams();
    params.agentIds.forEach((id) => searchParams.append("agentId", id));
    params.configIds.forEach((id) => searchParams.append("configId", id));
    if (params.days) searchParams.set("days", String(params.days));
    return fetchApi<{
      data: Array<{
        configId: string;
        configName: string;
        agentId: string;
        agentName: string;
        series: Array<{ date: string; avgScore: number; count: number }>;
      }>;
    }>(`/api/stats/comparison?${searchParams.toString()}`);
  },
  listAgentConfigPerformance: (
    agentId: string,
    params?: { limit?: number; offset?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ rows: AgentConfigPerformanceRow[] }>(
      `/api/stats/agents/${agentId}/configs${query ? `?${query}` : ""}`
    );
  },
  listAgentConfigTestCasePerformance: (
    agentId: string,
    params?: { configId?: string | null; limit?: number; offset?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.configId === null) searchParams.set("configId", "none");
    if (typeof params?.configId === "string")
      searchParams.set("configId", params.configId);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ rows: AgentConfigTestCasePerformanceRow[] }>(
      `/api/stats/agents/${agentId}/test-cases${query ? `?${query}` : ""}`
    );
  },

  // Agents
  listAgents: (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ agents: Agent[]; total: number }>(
      `/api/agents${query ? `?${query}` : ""}`
    );
  },
  getAgent: (id: string) => fetchApi<Agent>(`/api/agents/${id}`),
  deleteAgent: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/agents/${id}`, { method: "DELETE" }),
  importAgents: (baseUrl: string) =>
    fetchApi<{ imported: number; agents: Agent[] }>("/api/agents/import", {
      method: "POST",
      body: JSON.stringify({ baseUrl }),
    }),

  // Configs
  listConfigs: (params?: {
    search?: string;
    tags?: string[];
    tagMode?: "and" | "or";
    orderBy?: string;
    favoritesOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.tags && params.tags.length > 0)
      searchParams.set("tags", params.tags.join(","));
    if (params?.tagMode) searchParams.set("tagMode", params.tagMode);
    if (params?.orderBy) searchParams.set("orderBy", params.orderBy);
    if (params?.favoritesOnly) searchParams.set("favoritesOnly", "true");
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{
      configs: Config[];
      total: number;
      availableTags: string[];
    }>(`/api/configs${query ? `?${query}` : ""}`);
  },
  getConfig: (id: string) => fetchApi<Config>(`/api/configs/${id}`),
  createConfig: (data: {
    name: string;
    description?: string;
    configJson: Record<string, unknown>;
    tags?: string[];
  }) =>
    fetchApi<Config>("/api/configs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateConfig: (
    id: string,
    data: {
      name?: string;
      description?: string;
      configJson?: Record<string, unknown>;
      tags?: string[];
    }
  ) =>
    fetchApi<Config>(`/api/configs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteConfig: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/configs/${id}`, { method: "DELETE" }),
  duplicateConfig: (id: string, newName: string) =>
    fetchApi<Config>(`/api/configs/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ newName }),
    }),
  toggleConfigFavorite: (id: string) =>
    fetchApi<Config>(`/api/configs/${id}/toggle-favorite`, {
      method: "POST",
    }),
  getConfigVersions: (id: string) =>
    fetchApi<{ versions: Config[] }>(`/api/configs/${id}/versions`),

  // Quick Test
  getQuickTestFavorites: () =>
    fetchApi<{
      configs: Array<{
        id: string;
        name: string;
        description: string | null;
        runner: string | null;
        tags: string[];
      }>;
    }>("/api/quick-test/favorites"),
  executeQuickTest: (data: {
    configIds: string[];
    options?: {
      maxTestCasesPerConfig?: number;
      endpointBaseOverride?: string;
    };
  }) =>
    fetchApi<{
      runs: Array<{
        configId: string;
        configName: string;
        runId: string;
        status: string;
        error?: string;
      }>;
    }>("/api/quick-test/execute", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getQuickTestStatus: (runIds: string[]) =>
    fetchApi<{
      statuses: Array<{
        runId: string;
        status: string;
        completedTestCases?: number;
        totalTestCases?: number;
        avgScore?: number | null;
      }>;
    }>(`/api/quick-test/status?runIds=${runIds.join(",")}`),

  // Runs
  listRuns: (params?: {
    configId?: string;
    configTag?: string;
    status?: string;
    runner?: string;
    scorer?: string;
    source?: string;
    agentId?: string;
    provider?: string;
    includePracticeRuns?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.configId) searchParams.set("configId", params.configId);
    if (params?.configTag) searchParams.set("configTag", params.configTag);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.runner) searchParams.set("runner", params.runner);
    if (params?.scorer) searchParams.set("scorer", params.scorer);
    if (params?.source) searchParams.set("source", params.source);
    if (params?.agentId) searchParams.set("agentId", params.agentId);
    if (params?.provider) searchParams.set("provider", params.provider);
    if (params?.includePracticeRuns)
      searchParams.set("includePracticeRuns", "true");
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ runs: Run[]; total: number }>(
      `/api/runs${query ? `?${query}` : ""}`
    );
  },
  getRunFilterOptions: () =>
    fetchApi<{
      runners: string[];
      scorers: string[];
      sources: string[];
      statuses: string[];
      configTags: string[];
      agents: Array<{ id: string; name: string }>;
      providers: string[];
    }>("/api/runs/meta/filters"),
  getRun: (id: string) => fetchApi<Run>(`/api/runs/${id}`),
  getRunResults: (id: string, params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ results: Result[]; total: number }>(
      `/api/runs/${id}/results${query ? `?${query}` : ""}`
    );
  },
  createRun: (data: {
    configId?: string;
    configSnapshot: Record<string, unknown>;
    totalTestCases?: number;
    metadata?: Record<string, unknown>;
  }) =>
    fetchApi<Run>("/api/runs", { method: "POST", body: JSON.stringify(data) }),
  executeRun: (id: string) =>
    fetchApi<Run>(`/api/runs/${id}/execute`, { method: "POST" }),
  cancelRun: (id: string) =>
    fetchApi<Run>(`/api/runs/${id}/cancel`, { method: "POST" }),
  executeConfig: (data: {
    configId?: string;
    configSnapshot?: Record<string, unknown>;
  }) =>
    fetchApi<Run>("/api/runs/execute", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Results Explorer
  listAllResults: (params?: {
    configId?: string;
    configName?: string;
    testCaseId?: string;
    resultId?: string;
    runId?: string;
    agentId?: string;
    status?: string;
    scoreMin?: number;
    scoreMax?: number;
    runner?: string;
    scorer?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.configId) searchParams.set("configId", params.configId);
    if (params?.configName) searchParams.set("configName", params.configName);
    if (params?.testCaseId) searchParams.set("testCaseId", params.testCaseId);
    if (params?.resultId) searchParams.set("resultId", params.resultId);
    if (params?.runId) searchParams.set("runId", params.runId);
    if (params?.agentId) searchParams.set("agentId", params.agentId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.scoreMin !== undefined)
      searchParams.set("scoreMin", String(params.scoreMin));
    if (params?.scoreMax !== undefined)
      searchParams.set("scoreMax", String(params.scoreMax));
    if (params?.runner) searchParams.set("runner", params.runner);
    if (params?.scorer) searchParams.set("scorer", params.scorer);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ results: ResultExplorerRow[]; total: number }>(
      `/api/results${query ? `?${query}` : ""}`
    );
  },
  getResultFilterOptions: () =>
    fetchApi<ResultFilterOptions>("/api/results/meta/filters"),
  getResult: (id: string) => fetchApi<ResultDetail>(`/api/results/${id}`),
  rerunResult: (resultId: string) =>
    fetchApi<{ runId: string }>(`/api/results/${resultId}/rerun`, {
      method: "POST",
    }),

  // Feedback
  createFeedback: (data: {
    resultId: string;
    sentiment: "positive" | "negative";
    comment?: string;
    name?: string;
  }) =>
    fetchApi<Feedback>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listFeedback: (params: {
    configId?: string;
    sentiment?: "positive" | "negative";
    days?: number;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.configId) query.set("configId", params.configId);
    if (params.sentiment) query.set("sentiment", params.sentiment);
    if (params.days) query.set("days", String(params.days));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    const queryStr = query.toString();
    return fetchApi<ListFeedbackResponse>(
      `/api/feedback${queryStr ? `?${queryStr}` : ""}`
    );
  },
  getFeedbackStats: (params?: { days?: number }) => {
    const query = params?.days ? `?days=${params.days}` : "";
    return fetchApi<FeedbackStats>(`/api/feedback/stats${query}`);
  },

  // Test Cases
  listTestCaseSchemas: () =>
    fetchApi<TestCaseSchema[]>("/api/test-cases/schemas"),
  createTestCaseSchema: (data: {
    kind: string;
    namespace: string;
    version: string;
    jsonSchema: Record<string, unknown>;
    description?: string;
  }) =>
    fetchApi<TestCaseSchema>("/api/test-cases/schemas", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listTestCases: (params?: {
    schemaKind?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.schemaKind) searchParams.set("schemaKind", params.schemaKind);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ testCases: TestCase[]; total: number }>(
      `/api/test-cases${query ? `?${query}` : ""}`
    );
  },
  createTestCase: (data: {
    schemaKind: string;
    name?: string;
    data: Record<string, unknown>;
    description?: string;
    tags?: string[];
  }) =>
    fetchApi<TestCase>("/api/test-cases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteTestCase: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/test-cases/${id}`, {
      method: "DELETE",
    }),

  // Local Configs (file system)
  scanLocalConfigs: () => fetchApi<LocalConfigScanResult>("/api/local-configs"),
  getLocalConfig: (name: string) =>
    fetchApi<LocalConfigDetail>(
      `/api/local-configs/${encodeURIComponent(name)}`
    ),
  importLocalConfig: (name: string, customName?: string) =>
    fetchApi<LocalConfigImportResult>(
      `/api/local-configs/${encodeURIComponent(name)}/import`,
      {
        method: "POST",
        body: JSON.stringify({ customName }),
      }
    ),

  // Triggers
  listTriggers: (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ triggers: Trigger[]; total: number }>(
      `/api/triggers${query ? `?${query}` : ""}`
    );
  },
  getTrigger: (id: string) => fetchApi<Trigger>(`/api/triggers/${id}`),
  createTrigger: (data: {
    name: string;
    configId: string;
    intervalSeconds: number;
    enabled?: boolean;
    skipIfRecentRunSeconds?: number | null;
  }) =>
    fetchApi<Trigger>("/api/triggers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTrigger: (
    id: string,
    data: {
      name?: string;
      configId?: string;
      intervalSeconds?: number;
      enabled?: boolean;
      skipIfRecentRunSeconds?: number | null;
    }
  ) =>
    fetchApi<Trigger>(`/api/triggers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTrigger: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/triggers/${id}`, { method: "DELETE" }),
  fireTrigger: (id: string) =>
    fetchApi<{ success: boolean; runId?: string }>(`/api/triggers/${id}/fire`, {
      method: "POST",
    }),
  getTriggerConfigs: () =>
    fetchApi<{ configs: TriggerConfigOption[] }>("/api/triggers/meta/configs"),

  // Langfuse Triggers
  getLangfuseStatus: () =>
    fetchApi<{ configured: boolean; host: string }>(
      "/api/langfuse-triggers/status"
    ),
  listLangfuseTriggers: (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<{ triggers: LangfuseTrigger[]; total: number }>(
      `/api/langfuse-triggers${query ? `?${query}` : ""}`
    );
  },
  getLangfuseTrigger: (id: string) =>
    fetchApi<LangfuseTrigger>(`/api/langfuse-triggers/${id}`),
  createLangfuseTrigger: (data: {
    name: string;
    promptName: string;
    configId: string;
    debounceSeconds?: number;
    enabled?: boolean;
  }) =>
    fetchApi<LangfuseTrigger>("/api/langfuse-triggers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLangfuseTrigger: (
    id: string,
    data: {
      name?: string;
      promptName?: string;
      configId?: string;
      debounceSeconds?: number;
      enabled?: boolean;
    }
  ) =>
    fetchApi<LangfuseTrigger>(`/api/langfuse-triggers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteLangfuseTrigger: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/langfuse-triggers/${id}`, {
      method: "DELETE",
    }),
  getLangfuseTriggerConfigs: () =>
    fetchApi<{ configs: TriggerConfigOption[] }>(
      "/api/langfuse-triggers/meta/configs"
    ),
  getLangfusePrompts: () =>
    fetchApi<{ prompts: LangfusePromptOption[]; error?: string }>(
      "/api/langfuse-triggers/meta/prompts"
    ),
  syncLangfuse: () =>
    fetchApi<LangfuseSyncResult>("/api/langfuse-triggers/sync", {
      method: "POST",
    }),

  // Leaderboard
  getLeaderboard: (params?: { runner?: string; days?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.runner) searchParams.set("runner", params.runner);
    if (params?.days) searchParams.set("days", String(params.days));
    const query = searchParams.toString();
    return fetchApi<RunnerLeaderboard[]>(
      `/api/stats/leaderboard${query ? `?${query}` : ""}`
    );
  },

  getLeaderboardFilters: () =>
    fetchApi<LeaderboardFilters>("/api/stats/leaderboard/filters"),

  getFilteredLeaderboard: (params?: LeaderboardFilterParams) => {
    const searchParams = new URLSearchParams();
    if (params?.tags && params.tags.length > 0)
      searchParams.set("tags", params.tags.join(","));
    if (params?.tagMode) searchParams.set("tagMode", params.tagMode);
    if (params?.runner) searchParams.set("runner", params.runner);
    if (params?.scorer) searchParams.set("scorer", params.scorer);
    if (params?.days) searchParams.set("days", String(params.days));
    if (params?.minutes) searchParams.set("minutes", String(params.minutes));
    if (params?.configId) searchParams.set("configId", params.configId);
    if (params?.provider) searchParams.set("provider", params.provider);
    if (params?.agentId) searchParams.set("agentId", params.agentId);
    if (params?.minResults)
      searchParams.set("minResults", String(params.minResults));
    if (params?.compareAgents && params.compareAgents.length > 0) {
      searchParams.set("compareAgents", params.compareAgents.join(","));
    }
    if (params?.groupByPromptVersion) {
      searchParams.set("groupByPromptVersion", "true");
    }
    const query = searchParams.toString();
    return fetchApi<{ entries: LeaderboardEntry[] }>(
      `/api/stats/leaderboard/filtered${query ? `?${query}` : ""}`
    );
  },

  // Env var names (for config form)
  getEnvVarNames: () => fetchApi<{ names: string[] }>("/api/env-names"),

  // Health Checks (agent-based)
  triggerAgentHealthCheck: (agentId: string) =>
    fetchApi<{ result: HealthCheckResult }>(
      `/api/agents/${agentId}/health-check`,
      { method: "POST" }
    ),

  triggerAllHealthChecks: () =>
    fetchApi<{ results: HealthCheckResult[]; checked: number }>(
      "/api/agents/health-check-all",
      { method: "POST" }
    ),
};
