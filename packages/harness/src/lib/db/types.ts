import type {
  Agent,
  Config,
  Run,
  Result,
  Trigger,
  LangfuseTrigger,
  LangfusePromptVersion,
  HealthCheckResult,
  Feedback,
} from "@prisma/client";

export type {
  Agent,
  Config,
  Run,
  Result,
  Trigger,
  LangfuseTrigger,
  LangfusePromptVersion,
  HealthCheckResult,
  Feedback,
};

export type AgentWithHealthCheck = Agent & {
  lastHealthCheck: HealthCheckResult | null;
};

export type ConfigWithFailedCount = Config & {
  failedRunCount: number;
};

export type ResultListRow = {
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
  ttftMs: number | null;
  inputTokensUsed: number | null;
  outputTokensUsed: number | null;
  createdAt: Date;
};

export type ResultExplorerRow = ResultListRow & {
  configId: string | null;
  configName: string | null;
  runner: string | null;
  scorer: string | null;
};

export type ResultDetail = ResultExplorerRow & {
  startedAt: string | null;
  completedAt: string | null;
  systemPromptId: string | null;
  systemPromptVersion: number | null;
  systemPromptHash: string | null;
  inputCost: string | null;
  outputCost: string | null;
  pureTestCaseId: string | null;
  agentName: string | null;
};

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
  lastRunAt: Date | null;
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

export interface FeedbackWithContext extends Feedback {
  runId: string;
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
