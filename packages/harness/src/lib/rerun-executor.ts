import {
  type RunConfig,
  type TargetConfig,
  extractPromptFields,
} from "@peerbench/core";
import { getRegistries } from "./registry-context";
import {
  updateRunStatus,
  createResult,
  findOrCreateAgent,
} from "./db";
import { createRunLogger } from "./logger";
import {
  executeRunnerGeneric,
  extractTimeToFirstToken,
  normalizeEndpointUrl,
  serializeErrorForStorage,
} from "./run-executor";

export async function executeRerun(params: {
  runId: string;
  config: RunConfig;
  testCase: { id: string } & Record<string, unknown>;
  target: TargetConfig;
}): Promise<RerunResult> {
  const { runId, config, testCase, target } = params;
  const log = createRunLogger({ runId, source: "rerun-executor" });
  const startedAt = new Date();

  await updateRunStatus(runId, {
    status: "running",
    startedAt,
    totalTestCases: 1,
  });

  const runnerEntry = getRegistries().runners.find(config.runner);
  const providerEntry = getRegistries().providers.find(target.provider);
  const callableLLM = providerEntry.instantiateFromConfig(target);
  const endpointUrl = providerEntry.getEndpoint(target);
  const targetName = target.name || callableLLM.slug;

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

  const testCaseStartedAt = new Date();
  log.info("Rerun started", {
    testCaseId: testCase.id,
    target: targetName,
  });

  try {
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
      testCaseId: testCase.id,
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

    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - startedAt.getTime();

    await updateRunStatus(runId, {
      status: "completed",
      completedAt,
      completedTestCases: 1,
      successfulTestCases: 1,
      failedTestCases: 0,
      avgScore: result.score?.value,
      minScore: result.score?.value,
      maxScore: result.score?.value,
      totalDurationMs,
    });

    log.info("Rerun completed", {
      testCaseId: testCase.id,
      target: targetName,
      status: "success",
      durationMs,
      scoreValue: result.score?.value,
    });

    return { status: "completed", scoreValue: result.score?.value };
  } catch (error) {
    const errorMessage = serializeErrorForStorage(error);
    const testCaseCompletedAt = new Date();
    const durationMs =
      testCaseCompletedAt.getTime() - testCaseStartedAt.getTime();

    await createResult({
      runId,
      testCaseId: testCase.id,
      pureTestCaseId: testCase.id,
      agentId: executionAgent.id,
      status: "failed",
      errorMessage,
      testCase: testCase as unknown as Record<string, unknown>,
      durationMs,
      startedAt: testCaseStartedAt,
      completedAt: testCaseCompletedAt,
    });

    await updateRunStatus(runId, {
      status: "failed",
      completedAt: new Date(),
      completedTestCases: 1,
      successfulTestCases: 0,
      failedTestCases: 1,
      errorMessage,
      totalDurationMs: new Date().getTime() - startedAt.getTime(),
    });

    log.errorWithCause("Rerun failed", error, {
      testCaseId: testCase.id,
      target: targetName,
      durationMs,
    });

    return { status: "failed", errorMessage };
  }
}

type RerunResult = {
  status: "completed" | "failed";
  scoreValue?: number;
  errorMessage?: string;
};
