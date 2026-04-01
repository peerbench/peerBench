// Query key factories for TanStack Query
// Pattern: queryKeys.domain.action(params) returns readonly tuple

export const queryKeys = {
  // Agents
  agents: {
    all: ["agents"] as const,
    lists: () => [...queryKeys.agents.all, "list"] as const,
    list: (params?: { search?: string; limit?: number; offset?: number }) =>
      [...queryKeys.agents.lists(), params] as const,
    details: () => [...queryKeys.agents.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.agents.details(), id] as const,
    overview: (id: string) =>
      [...queryKeys.agents.detail(id), "overview"] as const,
    performance: (
      id: string,
      params?: {
        days?: number;
        configId?: string | null;
        configVersion?: number;
      }
    ) => [...queryKeys.agents.detail(id), "performance", params] as const,
    runPerformance: (
      id: string,
      params?: {
        days?: number;
        configId?: string | null;
        configVersion?: number;
      }
    ) => [...queryKeys.agents.detail(id), "runPerformance", params] as const,
    configPerformance: (
      id: string,
      params?: { limit?: number; offset?: number }
    ) => [...queryKeys.agents.detail(id), "configPerformance", params] as const,
    testCasePerformance: (
      id: string,
      params?: { configId?: string | null; limit?: number; offset?: number }
    ) =>
      [...queryKeys.agents.detail(id), "testCasePerformance", params] as const,
  },

  // Configs
  configs: {
    all: ["configs"] as const,
    lists: () => [...queryKeys.configs.all, "list"] as const,
    list: (params?: {
      search?: string;
      tags?: string[];
      tagMode?: "and" | "or";
      orderBy?: string;
      favoritesOnly?: boolean;
      limit?: number;
      offset?: number;
    }) => [...queryKeys.configs.lists(), params] as const,
    details: () => [...queryKeys.configs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.configs.details(), id] as const,
    versions: (id: string) =>
      [...queryKeys.configs.detail(id), "versions"] as const,
    stats: (id: string, params?: { days?: number }) =>
      [...queryKeys.configs.detail(id), "stats", params] as const,
  },

  // Runs
  runs: {
    all: ["runs"] as const,
    lists: () => [...queryKeys.runs.all, "list"] as const,
    list: (params?: {
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
    }) => [...queryKeys.runs.lists(), params] as const,
    details: () => [...queryKeys.runs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.runs.details(), id] as const,
    results: (id: string, params?: { limit?: number; offset?: number }) =>
      [...queryKeys.runs.detail(id), "results", params] as const,
    filterOptions: () => [...queryKeys.runs.all, "filterOptions"] as const,
  },

  // Results
  results: {
    all: ["results"] as const,
    lists: () => [...queryKeys.results.all, "list"] as const,
    list: (params?: {
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
    }) => [...queryKeys.results.lists(), params] as const,
    details: () => [...queryKeys.results.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.results.details(), id] as const,
    filterOptions: () => [...queryKeys.results.all, "filterOptions"] as const,
  },

  // Dashboard & Stats
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
  },

  // Leaderboard
  leaderboard: {
    all: ["leaderboard"] as const,
    filters: () => [...queryKeys.leaderboard.all, "filters"] as const,
    list: (params?: { runner?: string; days?: number }) =>
      [...queryKeys.leaderboard.all, "list", params] as const,
    filtered: (params?: {
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
    }) => [...queryKeys.leaderboard.all, "filtered", params] as const,
  },

  // Triggers
  triggers: {
    all: ["triggers"] as const,
    lists: () => [...queryKeys.triggers.all, "list"] as const,
    list: (params?: { search?: string; limit?: number; offset?: number }) =>
      [...queryKeys.triggers.lists(), params] as const,
    details: () => [...queryKeys.triggers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.triggers.details(), id] as const,
    configOptions: () => [...queryKeys.triggers.all, "configOptions"] as const,
  },

  // Langfuse Triggers
  langfuseTriggers: {
    all: ["langfuseTriggers"] as const,
    status: () => [...queryKeys.langfuseTriggers.all, "status"] as const,
    lists: () => [...queryKeys.langfuseTriggers.all, "list"] as const,
    list: (params?: { search?: string; limit?: number; offset?: number }) =>
      [...queryKeys.langfuseTriggers.lists(), params] as const,
    details: () => [...queryKeys.langfuseTriggers.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.langfuseTriggers.details(), id] as const,
    configOptions: () =>
      [...queryKeys.langfuseTriggers.all, "configOptions"] as const,
    prompts: () => [...queryKeys.langfuseTriggers.all, "prompts"] as const,
  },

  // Feedback
  feedback: {
    all: ["feedback"] as const,
    lists: () => [...queryKeys.feedback.all, "list"] as const,
    list: (params?: {
      configId?: string;
      sentiment?: "positive" | "negative";
      days?: number;
      limit?: number;
      offset?: number;
    }) => [...queryKeys.feedback.lists(), params] as const,
    forResult: (resultId: string) =>
      [...queryKeys.feedback.all, "forResult", resultId] as const,
    stats: (params?: { days?: number }) =>
      [...queryKeys.feedback.all, "stats", params] as const,
  },

  // Benchmark Meta (runners, scorers, schemas)
  benchmarkMeta: {
    all: ["benchmarkMeta"] as const,
  },

  // Quick Test
  quickTest: {
    all: ["quickTest"] as const,
    favorites: () => [...queryKeys.quickTest.all, "favorites"] as const,
    status: (runIds: string[]) =>
      [...queryKeys.quickTest.all, "status", runIds] as const,
  },
} as const;

// Type helper for query key inference
export type QueryKeys = typeof queryKeys;
