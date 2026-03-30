/**
 * Run executor using RunConfig and the registry system.
 * Entity resolution (providers, scorers, test case loading) is fully
 * delegated to the registries — the executor only orchestrates execution.
 */

import {
  RunConfigSchema,
  type RunConfig,
  type TargetConfig,
  type TestCaseSource,
  type ScorerConfig,
  runnerRegistry,
  storageRegistry,
  providerRegistry,
  resolveEnvVariables,
  resolveSupabaseAuthInConfig,
  extractPromptFields,
} from "@peerbench/core";
import {
  updateRunStatus,
  createResult,
  findOrCreateAgent,
  getRun,
  performHealthCheckForAgents,
} from "./db";
import { createRunLogger } from "./logger";
import { resolveSupabaseDiscoveryInConfig } from "./supabase-discovery/resolve";

export type ExecutionResult = {
  status: "completed" | "partial" | "failed";
  completedCount: number;
  successCount: number;
  failedCount: number;
  avgScore?: number;
  minScore?: number;
  maxScore?: number;
  totalDurationMs: number;
  errorMessage?: string;
};

/**
 * Parse and validate a config snapshot as RunConfig
 */
export async function parseConfig(
  configSnapshot: Record<string, unknown>
): Promise<RunConfig> {
  const resolved = resolveEnvVariables(configSnapshot);
  const withDiscovery = await resolveSupabaseDiscoveryInConfig(resolved);
  const withAuth = await resolveSupabaseAuthInConfig(withDiscovery);
  return RunConfigSchema.parse(withAuth);
}

/**
 * Load test cases from all configured storage sources
 */
async function loadTestCases(
  sources: TestCaseSource[]
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  const allTestCases: Array<{ id: string } & Record<string, unknown>> = [];

  for (const source of sources) {
    const storage = storageRegistry
      .find(source.storage)
      .instantiateFromConfig(source);
    await storage.init();
    const cases = await storage.readAll();
    allTestCases.push(
      ...(cases as Array<{ id: string } & Record<string, unknown>>)
    );
  }

  return allTestCases;
}

export function executeRunnerGeneric(
  entry: { executeFromConfig: (...args: any[]) => Promise<any> },
  config: {
    testCase: unknown;
    target: TargetConfig;
    runnerParams?: Record<string, unknown>;
    scorerConfig?: ScorerConfig;
  }
): Promise<GenericExecuteResult> {
  return entry.executeFromConfig(config);
}

export type ExecutionOptions = {
  maxTestCases?: number;
};

/**
 * Execute a run using RunConfig and the registry system
 */
export async function executeRun(params: {
  runId: string;
  config: RunConfig;
  options?: ExecutionOptions;
}): Promise<ExecutionResult> {
  const { runId, config, options = {} } = params;
  const startedAt = new Date();
  const log = createRunLogger({ runId, source: "run-executor" });

  log.info("Starting run", { runner: config.runner, options });

  const runnerEntry = runnerRegistry.find(config.runner);
  log.info("Runner resolved", { runner: config.runner });

  await updateRunStatus(runId, { status: "running", startedAt });

  // Fire-and-forget pre-run health checks (linked to this run via runId)
  const preRunAgentIds = await resolveAgentIdsFromTargets(config.targets);
  if (preRunAgentIds.length > 0) {
    performHealthCheckForAgents(preRunAgentIds, runId).catch((err) =>
      log.warn("Pre-run health check failed", { err })
    );
  }

  log.info("Loading test cases", { sources: config.testCases.length });
  let testCases = await loadTestCases(config.testCases);

  if (testCases.length === 0) {
    throw new Error("No test cases found from configured storage sources.");
  }

  // Apply maxTestCases limit if specified
  if (
    options.maxTestCases &&
    options.maxTestCases > 0 &&
    testCases.length > options.maxTestCases
  ) {
    log.info("Limiting test cases", {
      original: testCases.length,
      limit: options.maxTestCases,
    });
    testCases = testCases.slice(0, options.maxTestCases);
  }

  const totalExecutions = testCases.length * config.targets.length;
  log.info("Starting test cases", {
    testCases: testCases.length,
    targets: config.targets.length,
    totalExecutions,
  });
  await updateRunStatus(runId, { totalTestCases: totalExecutions });

  let completedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  const scores: number[] = [];
  const maxParallel = config.maxParallel;

  const executeTestCase = async (
    target: TargetConfig,
    testCase: { id: string } & Record<string, unknown>,
    executionAgent: { id: string },
    targetName: string
  ): Promise<void> => {
    const combinedTestCaseId =
      config.targets.length > 1 ? `${testCase.id}::${targetName}` : testCase.id;
    const testCaseStartedAt = new Date();
    log.debug("Test case started", {
      testCaseId: combinedTestCaseId,
      target: targetName,
    });

    try {
      log.info("UI: request", {
        ui: createUiRequestEvent({
          testCaseId: combinedTestCaseId,
          runner: config.runner,
          provider: target.provider,
          model: targetName,
          testCase,
        }),
      });

      const result = await executeRunnerGeneric(runnerEntry, {
        testCase,
        target,
        runnerParams: config.runnerParams,
        scorerConfig: config.scorer,
      });

      const testCaseCompletedAt = new Date();
      const durationMs =
        testCaseCompletedAt.getTime() - testCaseStartedAt.getTime();

      const ttftMs = extractTimeToFirstToken(result.response);

      const responseMetadata = result.response.metadata as
        | Record<string, unknown>
        | undefined;
      const promptFields = extractPromptFields(responseMetadata);

      await createResult({
        runId,
        testCaseId: combinedTestCaseId,
        pureTestCaseId: testCase.id,
        agentId: executionAgent.id,
        systemPromptId: promptFields.systemPromptId,
        systemPromptVersion: promptFields.systemPromptVersion,
        systemPromptHash: promptFields.systemPromptHash,
        status: "success",
        response: result.response as unknown as Record<string, unknown>,
        score: result.score as unknown as Record<string, unknown>,
        testCase: testCase as unknown as Record<string, unknown>,
        scoreValue: result.score?.value,
        inputTokensUsed: result.response.inputTokensUsed,
        outputTokensUsed: result.response.outputTokensUsed,
        inputCost: result.response.inputCost,
        outputCost: result.response.outputCost,
        durationMs,
        ttftMs,
        startedAt: testCaseStartedAt,
        completedAt: testCaseCompletedAt,
      });

      const currentSuccessCount = ++successCount;
      if (result.score?.value !== undefined) {
        scores.push(result.score.value);
      }

      const responsePreviewReplies = normalizeRepliesForLogging({
        replies: result.response.replies,
        data: result.response.data,
      });

      log.info("UI: response", {
        ui: createUiResponseEvent({
          testCaseId: combinedTestCaseId,
          modelSlug: result.response.modelSlug,
          replies: responsePreviewReplies,
        }),
      });

      log.info("UI: score", {
        ui: createUiScoreEvent({
          testCaseId: combinedTestCaseId,
          scoreValue: result.score?.value,
          scoreExplanation: result.score?.explanation,
        }),
      });

      log.info("Target replies", {
        testCaseId: combinedTestCaseId,
        target: targetName,
        ...summarizeRepliesForLog(responsePreviewReplies),
      });

      log.info("Test case completed", {
        testCaseId: combinedTestCaseId,
        target: targetName,
        status: "success",
        durationMs,
        scoreValue: result.score?.value,
      });

      const currentCompletedCount = ++completedCount;
      await updateRunStatus(runId, {
        completedTestCases: currentCompletedCount,
        successfulTestCases: currentSuccessCount,
        failedTestCases: failedCount,
      });
    } catch (rawError) {
      const testCaseCompletedAt = new Date();
      const durationMs =
        testCaseCompletedAt.getTime() - testCaseStartedAt.getTime();

      const error = enrichErrorContext(rawError, {
        target: targetName,
        provider: target.provider,
        scorerType: config.scorer?.type,
      });
      const errorMessage = serializeErrorForStorage(error);

      await createResult({
        runId,
        testCaseId: combinedTestCaseId,
        pureTestCaseId: testCase.id,
        agentId: executionAgent.id,
        status: "failed",
        errorMessage,
        testCase: testCase as unknown as Record<string, unknown>,
        durationMs,
        startedAt: testCaseStartedAt,
        completedAt: testCaseCompletedAt,
      });

      const currentFailedCount = ++failedCount;
      log.errorWithCause("Test case failed", error, {
        testCaseId: combinedTestCaseId,
        target: targetName,
        durationMs,
      });

      log.info("UI: error", {
        ui: createUiErrorEvent({
          testCaseId: combinedTestCaseId,
          error,
        }),
      });

      const currentCompletedCount = ++completedCount;
      await updateRunStatus(runId, {
        completedTestCases: currentCompletedCount,
        successfulTestCases: successCount,
        failedTestCases: currentFailedCount,
      });
    }
  };

  const processTarget = async (target: TargetConfig): Promise<void> => {
    const providerEntry = providerRegistry.find(target.provider);
    const callableLLM = providerEntry.instantiateFromConfig(target);
    const endpointUrl = providerEntry.getEndpoint(target);

    const targetName = target.name || callableLLM.slug;
    log.info("Processing target", {
      targetName,
      provider: target.provider,
      slug: callableLLM.slug,
    });

    const { agent: executionAgent } = await findOrCreateAgent({
      agentId: callableLLM.slug,
      name: target.name,
      provider: target.provider,
      endpointUrl: normalizeEndpointUrl(endpointUrl),
      metadata: {
        provider: target.provider,
        targetName,
        model: callableLLM.slug,
      },
    });

    // Calculate parallelism for this target
    let targetParallelism: number | undefined;
    if (maxParallel > 1) {
      if (config.targets.length === 1) {
        targetParallelism = maxParallel;
      } else {
        const baseParallelism = Math.floor(maxParallel / config.targets.length);
        const remainder = maxParallel % config.targets.length;
        const targetIndex = config.targets.indexOf(target);
        targetParallelism = baseParallelism + (targetIndex < remainder ? 1 : 0);
      }
    }

    if (targetParallelism && targetParallelism > 1) {
      await mapWithConcurrency(
        testCases,
        targetParallelism,
        async (testCase) => {
          const currentRun = await getRun(runId);
          if (currentRun?.status !== "running") return;
          await executeTestCase(target, testCase, executionAgent, targetName);
        }
      );
    } else {
      for (const testCase of testCases) {
        const currentRun = await getRun(runId);
        if (currentRun?.status !== "running") {
          log.info("Run cancelled, stopping execution", { targetName });
          break;
        }
        await executeTestCase(target, testCase, executionAgent, targetName);
      }
    }
  };

  if (config.targets.length > 1) {
    await mapWithConcurrency(
      config.targets,
      config.targets.length,
      async (target) => {
        const currentRun = await getRun(runId);
        if (currentRun?.status !== "running") return;
        await processTarget(target);
      }
    );
  } else {
    for (const target of config.targets) {
      const currentRun = await getRun(runId);
      if (currentRun?.status !== "running") {
        log.info("Run cancelled, stopping target processing");
        break;
      }
      await processTarget(target);
    }
  }

  // Check if run was cancelled
  const runAfterExecution = await getRun(runId);
  if (runAfterExecution?.status !== "running") {
    log.info("Run was cancelled during execution", {
      completedCount,
      successCount,
      failedCount,
    });
    return {
      status: "partial",
      completedCount,
      successCount,
      failedCount,
      avgScore:
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : undefined,
      minScore: scores.length > 0 ? Math.min(...scores) : undefined,
      maxScore: scores.length > 0 ? Math.max(...scores) : undefined,
      totalDurationMs: new Date().getTime() - startedAt.getTime(),
    };
  }

  const completedAt = new Date();
  const totalDurationMs = completedAt.getTime() - startedAt.getTime();

  const avgScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : undefined;
  const minScore = scores.length > 0 ? Math.min(...scores) : undefined;
  const maxScore = scores.length > 0 ? Math.max(...scores) : undefined;

  const finalStatus =
    failedCount > 0 && successCount > 0
      ? "partial"
      : failedCount === 0
        ? "completed"
        : "failed";

  await updateRunStatus(runId, {
    status: finalStatus,
    completedAt,
    totalDurationMs,
    avgScore,
    minScore,
    maxScore,
  });

  log.info("Run completed", {
    status: finalStatus,
    completedCount,
    successCount,
    failedCount,
    totalDurationMs,
    avgScore,
    minScore,
    maxScore,
  });

  return {
    status: finalStatus,
    completedCount,
    successCount,
    failedCount,
    avgScore,
    minScore,
    maxScore,
    totalDurationMs,
  };
}

// --- Helpers ---

async function mapWithConcurrency<T>(
  items: T[],
  maxParallel: number,
  runOne: (item: T) => Promise<void>
): Promise<void> {
  const limit = Math.max(1, Math.floor(maxParallel));
  let nextIndex = 0;

  const workers = new Array(Math.min(limit, items.length))
    .fill(null)
    .map(async () => {
      while (true) {
        const current = nextIndex++;
        if (current >= items.length) return;
        await runOne(items[current]!);
      }
    });

  await Promise.all(workers);
}

export function normalizeEndpointUrl(value: string): string {
  return value.trim().replace(/\/+$/g, "");
}

async function resolveAgentIdsFromTargets(
  targets: TargetConfig[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const target of targets) {
    try {
      const providerEntry = providerRegistry.find(target.provider);
      const callableLLM = providerEntry.instantiateFromConfig(target);
      const endpointUrl = normalizeEndpointUrl(
        providerEntry.getEndpoint(target)
      );

      const { agent } = await findOrCreateAgent({
        agentId: callableLLM.slug,
        name: target.name,
        provider: target.provider,
        endpointUrl,
        metadata: {
          provider: target.provider,
          model: callableLLM.slug,
        },
      });

      ids.push(agent.id);
    } catch {
      // Skip targets that fail to resolve
    }
  }

  return ids;
}

export function extractTimeToFirstToken(response: unknown): number | undefined {
  if (!response || typeof response !== "object") return undefined;

  const resp = response as Record<string, unknown>;

  if (Array.isArray(resp.replies) && resp.replies.length > 0) {
    const firstReply = resp.replies[0] as Record<string, unknown> | undefined;
    if (firstReply && typeof firstReply.timeToFirstToken === "number") {
      return firstReply.timeToFirstToken;
    }
  }

  if (typeof resp.timeToFirstToken === "number") {
    return resp.timeToFirstToken;
  }

  return undefined;
}

function summarizeRepliesForLog(replies: unknown): {
  replyCount: number;
  replies: string[];
  truncated: boolean;
} {
  const maxReplies = 3;
  const maxCharsPerReply = isFullReplyLoggingEnabled() ? 20_000 : 2_000;

  const list = Array.isArray(replies) ? replies : [];
  const replyCount = list.length;

  const preview: string[] = [];
  let truncated = false;

  for (const reply of list.slice(0, maxReplies)) {
    const text = replyToText(reply);
    if (text.length > maxCharsPerReply) {
      preview.push(`${text.slice(0, maxCharsPerReply)}…`);
      truncated = true;
    } else {
      preview.push(text);
    }
  }

  if (replyCount > maxReplies) {
    truncated = true;
  }

  return { replyCount, replies: preview, truncated };
}

function normalizeRepliesForLogging(params: {
  replies: unknown;
  data: unknown;
}): unknown[] {
  if (Array.isArray(params.replies) && params.replies.length > 0) {
    return params.replies;
  }

  if (typeof params.data === "string") {
    const trimmed = params.data.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (params.data !== null && params.data !== undefined) {
    return [params.data];
  }

  return [];
}

function replyToText(reply: unknown): string {
  if (typeof reply === "string") return reply;
  if (typeof reply === "number" || typeof reply === "boolean")
    return String(reply);

  if (typeof reply === "object" && reply !== null) {
    const maybeContent = (reply as { content?: unknown }).content;
    if (typeof maybeContent === "string") return maybeContent;

    try {
      return JSON.stringify(reply);
    } catch {
      return "[Unserializable reply]";
    }
  }

  return reply === null || reply === undefined ? "" : String(reply);
}

function isFullReplyLoggingEnabled(): boolean {
  const raw = process.env.LOG_FULL_REPLIES;
  if (!raw) return false;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function serializeErrorForStorage(error: unknown): string {
  if (error instanceof Error) {
    const parts: string[] = [];
    if (error.name) parts.push(`${error.name}:`);
    if (error.message) parts.push(error.message);
    if (error.stack) {
      parts.push("\n\nStack trace:");
      parts.push(error.stack);
    }
    return parts.join(" ");
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

// --- UI Log Events ---

function createUiRequestEvent(params: {
  testCaseId: string;
  runner: string;
  provider: string;
  model: string;
  testCase: unknown;
}): UiLogEventData {
  return {
    kind: "request",
    testCaseId: params.testCaseId,
    runner: params.runner,
    provider: params.provider,
    model: params.model,
    testCase: params.testCase,
  };
}

function createUiResponseEvent(params: {
  testCaseId: string;
  modelSlug?: string;
  replies: unknown;
}): UiLogEventData {
  const list = Array.isArray(params.replies) ? params.replies : [];
  const repliesText = list.map(replyToText);
  return {
    kind: "response",
    testCaseId: params.testCaseId,
    modelSlug: params.modelSlug,
    replyCount: repliesText.length,
    replies: repliesText,
  };
}

function createUiScoreEvent(params: {
  testCaseId: string;
  scoreValue: number | undefined;
  scoreExplanation: string | undefined;
}): UiLogEventData {
  return {
    kind: "score",
    testCaseId: params.testCaseId,
    scoreValue: params.scoreValue,
    scoreExplanation: params.scoreExplanation,
  };
}

function createUiErrorEvent(params: {
  testCaseId: string;
  error: unknown;
}): UiLogEventData {
  const errorMessage =
    params.error instanceof Error ? params.error.message : String(params.error);
  return {
    kind: "error",
    testCaseId: params.testCaseId,
    errorMessage,
  };
}

type UiLogEventData =
  | (UiRequestEvent & { kind: "request" })
  | (UiResponseEvent & { kind: "response" })
  | (UiScoreEvent & { kind: "score" })
  | (UiErrorEvent & { kind: "error" });

type UiRequestEvent = {
  testCaseId: string;
  runner: string;
  provider: string;
  model: string;
  testCase: unknown;
};

type UiResponseEvent = {
  testCaseId: string;
  modelSlug?: string;
  replyCount: number;
  replies: string[];
};

type UiScoreEvent = {
  testCaseId: string;
  scoreValue?: number;
  scoreExplanation?: string;
};

type UiErrorEvent = {
  testCaseId: string;
  errorMessage: string;
};

export type GenericExecuteResult = {
  response: {
    inputTokensUsed?: number;
    outputTokensUsed?: number;
    inputCost?: string;
    outputCost?: string;
    modelSlug?: string;
    replies?: unknown[];
    data?: unknown;
    [key: string]: unknown;
  };
  score?: {
    value?: number;
    explanation?: string;
    [key: string]: unknown;
  };
};

/**
 * Enrich vague errors from external dependencies with execution context
 * so the user can immediately see which service/component failed.
 *
 * Maps known vague error patterns to more descriptive messages:
 *  - peerbench "Invalid credentials provided" → identifies the scorer provider
 *  - Generic 401/403 without a URL → adds the target info
 */
function enrichErrorContext(
  error: unknown,
  context: {
    target: string;
    provider: string;
    scorerType?: string;
  }
): unknown {
  if (!(error instanceof Error)) return error;

  const msg = error.message;

  if (msg === "Invalid credentials provided") {
    const scorerLabel = context.scorerType
      ? ` (scorer: ${context.scorerType})`
      : "";
    error.message = `Scorer API auth failed${scorerLabel}: Invalid credentials provided. Check the scorer's API key configuration.`;
    return error;
  }

  if (
    /\b(401|403)\b/.test(msg) &&
    !msg.includes("http://") &&
    !msg.includes("https://")
  ) {
    error.message = `[target: ${context.target}, provider: ${context.provider}] ${msg}`;
    return error;
  }

  return error;
}
