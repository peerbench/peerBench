import type {
  Agent,
  AgentOverview,
  AgentConfigPerformanceRow,
  AgentConfigTestCasePerformanceRow,
  BenchmarkMeta,
  Config,
  ConfigDashboardData,
  ConfigDashboardSummary,
  Run,
  Result,
  ResultExplorerRow,
  RunnerMeta,
  ScorerMeta,
  SchemaSetMeta,
  Trigger,
  LangfuseTrigger,
  LeaderboardEntry,
  TriggerConfigOption,
} from "@/lib/api";

let counter = 0;
function uid() {
  counter += 1;
  return `mock-${counter}`;
}

export function resetMockIds() {
  counter = 0;
}

export function mockAgent(overrides?: Partial<Agent>): Agent {
  const id = uid();
  return {
    id,
    agentId: `agent-${id}`,
    name: `Agent ${id}`,
    provider: "openai",
    endpointUrl: `https://api.example.com/${id}`,
    description: null,
    metadata: {},
    lastHealthCheck: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockConfig(overrides?: Partial<Config>): Config {
  const id = uid();
  return {
    id,
    name: `Config ${id}`,
    description: null,
    configJson: { runner: "test-runner" },
    configHash: "abc123",
    version: 1,
    runCount: 0,
    failedRunCount: 0,
    tags: [],
    isFavorite: false,
    createdBy: null,
    initialConfigId: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockRun(overrides?: Partial<Run>): Run {
  const id = uid();
  return {
    id,
    configId: "config-1",
    configName: "Test Config",
    configSnapshot: { runner: "test-runner" },
    status: "completed",
    totalTestCases: 10,
    completedTestCases: 10,
    successfulTestCases: 8,
    failedTestCases: 2,
    avgScore: 0.85,
    minScore: 0.5,
    maxScore: 1.0,
    totalDurationMs: 5000,
    startedAt: "2025-01-01T00:00:00Z",
    completedAt: "2025-01-01T00:01:00Z",
    errorMessage: null,
    metadata: {},
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockResult(overrides?: Partial<Result>): Result {
  const id = uid();
  return {
    id,
    runId: "run-1",
    testCaseId: "tc-1",
    agentId: null,
    modelSlug: null,
    agentEndpointUrl: null,
    agentProvider: null,
    status: "completed",
    errorMessage: null,
    response: null,
    score: null,
    testCase: null,
    scoreValue: 0.9,
    durationMs: 500,
    ttftMs: null,
    inputTokensUsed: null,
    outputTokensUsed: null,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockResultExplorerRow(
  overrides?: Partial<ResultExplorerRow>
): ResultExplorerRow {
  return {
    ...mockResult(),
    configId: "config-1",
    configName: "Test Config",
    runner: "test-runner",
    scorer: "test-scorer",
    ...overrides,
  };
}

export function mockTrigger(overrides?: Partial<Trigger>): Trigger {
  const id = uid();
  return {
    id,
    name: `Trigger ${id}`,
    configId: "config-1",
    configName: "Test Config",
    enabled: 1,
    intervalSeconds: 3600,
    skipIfRecentRunSeconds: null,
    nextRunAt: null,
    lastRunAt: null,
    lastRunId: null,
    lastRunStatus: null,
    runCount: 0,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockLangfuseTrigger(
  overrides?: Partial<LangfuseTrigger>
): LangfuseTrigger {
  const id = uid();
  return {
    id,
    name: `Langfuse Trigger ${id}`,
    promptName: "test-prompt",
    configId: "config-1",
    configName: "Test Config",
    enabled: 1,
    debounceSeconds: 300,
    lastSeenVersion: null,
    lastTriggeredAt: null,
    lastTriggeredVersion: null,
    lastRunId: null,
    lastRunStatus: null,
    triggerCount: 0,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockLeaderboardEntry(
  overrides?: Partial<LeaderboardEntry>
): LeaderboardEntry {
  const id = uid();
  return {
    rank: 1,
    agentId: id,
    agentName: `Agent ${id}`,
    agentProvider: "openai",
    systemPromptId: null,
    systemPromptVersion: null,
    runCount: 5,
    resultCount: 50,
    scoredCount: 45,
    avgScore: 0.85,
    minScore: 0.5,
    maxScore: 1.0,
    avgDurationMs: 1000,
    minDurationMs: 500,
    maxDurationMs: 2000,
    avgTtftMs: null,
    ttftCount: 0,
    lastRunAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockConfigDashboardSummary(
  overrides?: Partial<ConfigDashboardSummary>
): ConfigDashboardSummary {
  const id = uid();
  return {
    configId: id,
    configName: `Config ${id}`,
    configVersion: 1,
    initialConfigId: null,
    tags: [],
    isFavorite: false,
    lastRunId: `run-${id}`,
    lastRunStatus: "completed",
    lastRunScore: 0.85,
    lastRunTotalTestCases: 10,
    lastRunCompletedTestCases: 10,
    lastRunAt: "2025-01-01T00:00:00Z",
    runsThisWeek: 3,
    failedRunsThisWeek: 0,
    isRegressed: false,
    sparkline: [
      {
        runId: `run-${id}-1`,
        score: 0.8,
        status: "completed",
        createdAt: "2025-01-01T00:00:00Z",
      },
      {
        runId: `run-${id}-2`,
        score: 0.85,
        status: "completed",
        createdAt: "2025-01-02T00:00:00Z",
      },
    ],
    targetBreakdown: [
      {
        target: "agent-alpha",
        avgScore: 0.85,
        resultCount: 10,
        failedCount: 0,
      },
    ],
    ...overrides,
  };
}

export function mockConfigDashboardData(
  overrides?: Partial<ConfigDashboardData>
): ConfigDashboardData {
  return {
    operationalStats: {
      activeConfigs: 3,
      totalConfigs: 5,
      runsThisWeek: 12,
      runsLastWeek: 10,
      failedRunsThisWeek: 1,
      partialRunsThisWeek: 0,
      regressionsDetected: 0,
    },
    configSummaries: [mockConfigDashboardSummary()],
    ...overrides,
  };
}

export function mockTriggerConfigOption(
  overrides?: Partial<TriggerConfigOption>
): TriggerConfigOption {
  const id = uid();
  return {
    id,
    name: `Config ${id}`,
    ...overrides,
  };
}

export function mockAgentOverview(
  overrides?: Partial<AgentOverview>
): AgentOverview {
  return {
    runCount: 10,
    resultCount: 50,
    scoredCount: 45,
    avgScore: 0.85,
    minScore: 0.5,
    maxScore: 1.0,
    lastRunAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockAgentConfigPerformanceRow(
  overrides?: Partial<AgentConfigPerformanceRow>
): AgentConfigPerformanceRow {
  const id = uid();
  return {
    configId: id,
    configName: `Config ${id}`,
    configVersion: 1,
    runCount: 5,
    resultCount: 25,
    scoredCount: 20,
    avgScore: 0.8,
    lastRunAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockAgentConfigTestCasePerformanceRow(
  overrides?: Partial<AgentConfigTestCasePerformanceRow>
): AgentConfigTestCasePerformanceRow {
  const id = uid();
  return {
    configId: "config-1",
    testCaseId: id,
    testCaseName: `Test Case ${id}`,
    runCount: 3,
    resultCount: 3,
    scoredCount: 3,
    avgScore: 0.9,
    lastRunAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockRunnerMeta(overrides?: Partial<RunnerMeta>): RunnerMeta {
  const id = uid();
  return {
    id: `runner-${id}`,
    name: `Runner ${id}`,
    description: `Description for runner ${id}`,
    schemaSet: "default",
    configSchema: {},
    exampleConfig: {},
    ...overrides,
  };
}

export function mockScorerMeta(overrides?: Partial<ScorerMeta>): ScorerMeta {
  const id = uid();
  return {
    id: `scorer-${id}`,
    name: `Scorer ${id}`,
    description: `Description for scorer ${id}`,
    longDescription: `Long description for scorer ${id}`,
    requiresProvider: false,
    ...overrides,
  };
}

export function mockSchemaSetMeta(
  overrides?: Partial<SchemaSetMeta>
): SchemaSetMeta {
  const id = uid();
  return {
    id: `schema-${id}`,
    kind: `llm/test.tc`,
    name: `Schema ${id}`,
    description: `Description for schema ${id}`,
    version: 1,
    testCaseFields: ["input", "expectedOutput"],
    ...overrides,
  };
}

export function mockBenchmarkMeta(
  overrides?: Partial<BenchmarkMeta>
): BenchmarkMeta {
  return {
    runners: [mockRunnerMeta()],
    scorers: [mockScorerMeta()],
    schemaSets: [mockSchemaSetMeta()],
    ...overrides,
  };
}
