import { Hono } from "hono";
import {
  providerRegistry,
  resolveEnvVariables,
  RunConfigSchema,
} from "@peerbench/core";
import {
  listAllResults,
  getResultById,
  getResultFilterOptions,
  getRun,
  createRun,
  updateRunStatus,
} from "../lib/db";
import { executeRerun } from "../lib/rerun-executor";
import { createRunLogger } from "../lib/logger";

export const resultsRouter = new Hono();

resultsRouter.get("/meta/filters", async (c) => {
  const options = await getResultFilterOptions();
  return c.json(options);
});

resultsRouter.get("/", async (c) => {
  const configId = c.req.query("configId");
  const configName = c.req.query("configName");
  const testCaseId = c.req.query("testCaseId");
  const resultId = c.req.query("resultId");
  const runId = c.req.query("runId");
  const agentId = c.req.query("agentId");
  const status = c.req.query("status");
  const runner = c.req.query("runner");
  const scorer = c.req.query("scorer");
  const scoreMinRaw = c.req.query("scoreMin");
  const scoreMaxRaw = c.req.query("scoreMax");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const scoreMin =
    scoreMinRaw !== undefined ? parseFloat(scoreMinRaw) : undefined;
  const scoreMax =
    scoreMaxRaw !== undefined ? parseFloat(scoreMaxRaw) : undefined;

  const result = await listAllResults({
    configId: configId || undefined,
    configName: configName || undefined,
    testCaseId: testCaseId || undefined,
    resultId: resultId || undefined,
    runId: runId || undefined,
    agentId: agentId || undefined,
    status: status || undefined,
    scoreMin: scoreMin !== undefined && !isNaN(scoreMin) ? scoreMin : undefined,
    scoreMax: scoreMax !== undefined && !isNaN(scoreMax) ? scoreMax : undefined,
    runner: runner || undefined,
    scorer: scorer || undefined,
    limit,
    offset,
  });

  return c.json(result);
});

resultsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await getResultById(id);

  if (!result) {
    return c.json({ error: "Result not found" }, 404);
  }

  return c.json(result);
});

resultsRouter.post("/:id/rerun", async (c) => {
  const resultId = c.req.param("id");
  const log = createRunLogger({ source: "routes/results/rerun" });

  const originalResult = await getResultById(resultId);
  if (!originalResult) {
    return c.json({ error: "Result not found" }, 404);
  }

  const originalRun = await getRun(originalResult.runId);
  if (!originalRun) {
    return c.json({ error: "Original run not found" }, 404);
  }

  const configSnapshot = originalRun.configSnapshot as Record<string, unknown>;

  let config;
  try {
    const resolved = resolveEnvVariables(configSnapshot);
    config = RunConfigSchema.parse(resolved);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to parse config: ${msg}` }, 400);
  }

  const matchingTarget = config.targets.find((t) => {
    try {
      const providerEntry = providerRegistry.find(t.provider);
      const callableLLM = providerEntry.instantiateFromConfig(t);
      const targetName = t.name || callableLLM.slug;
      log.debug("Rerun target matching", {
        targetName,
        expectedSlug: originalResult.modelSlug,
        provider: t.provider,
        match: targetName === originalResult.modelSlug,
      });
      return targetName === originalResult.modelSlug;
    } catch (err) {
      log.warn("Rerun target matching failed for provider", {
        provider: t.provider,
        targetName: t.name,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  });

  if (!matchingTarget) {
    log.error("Could not find matching target in original config", {
      expectedSlug: originalResult.modelSlug,
      availableTargets: config.targets.map((t) => ({
        provider: t.provider,
        name: t.name,
      })),
    });
    return c.json(
      { error: "Could not find matching target in original config" },
      400
    );
  }

  const testCase = originalResult.testCase as
    | ({ id: string } & Record<string, unknown>)
    | null;
  if (!testCase || !testCase.id) {
    return c.json({ error: "Original result has no test case data" }, 400);
  }

  let newRun;
  try {
    newRun = await createRun({
      configId: originalRun.configId ?? undefined,
      configVersion: originalRun.configVersion ?? undefined,
      configSnapshot,
      metadata: {
        triggeredBy: "rerun",
        rerunOfResultId: resultId,
        rerunOfRunId: originalResult.runId,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.errorWithCause("Failed to create rerun", error);
    return c.json({ error: `Failed to create rerun: ${msg}` }, 500);
  }

  try {
    await executeRerun({
      runId: newRun.id,
      config,
      testCase,
      target: matchingTarget,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    log.errorWithCause("Rerun execution failed", error);
    await updateRunStatus(newRun.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage,
    });
  }

  const updatedRun = await getRun(newRun.id);
  return c.json({ runId: newRun.id, run: updatedRun }, 201);
});
