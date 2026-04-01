import { Hono } from "hono";
import {
  createRun,
  findOrCreateConfig,
  getConfig,
  getRun,
  getRunFilterOptions,
  incrementRunCount,
  listResults,
  listRuns,
  updateRunStatus,
} from "../lib/db";
import { executeRun, parseConfig } from "../lib/run-executor";
import { createRunLogger } from "../lib/logger";
import { getRegistries } from "../lib/registry-context";

export const runsRouter = new Hono();

// List runs
runsRouter.get("/", async (c) => {
  const configId = c.req.query("configId");
  const configTag = c.req.query("configTag");
  const status = c.req.query("status");
  const runner = c.req.query("runner");
  const scorer = c.req.query("scorer");
  const source = c.req.query("source");
  const agentId = c.req.query("agentId");
  const provider = c.req.query("provider");
  const includePracticeRuns = c.req.query("includePracticeRuns") === "true";
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await listRuns({
    configId,
    configTag,
    status,
    runner,
    scorer,
    source,
    agentId,
    provider,
    includePracticeRuns,
    limit,
    offset,
  });
  return c.json(result);
});

// Get filter options for dropdowns
runsRouter.get("/meta/filters", async (c) => {
  const options = await getRunFilterOptions();
  return c.json(options);
});

// Get single run
runsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const run = await getRun(id);

  if (!run) {
    return c.json({ error: "Run not found" }, 404);
  }

  return c.json(run);
});

// Get run results
runsRouter.get("/:id/results", async (c) => {
  const runId = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "100", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await listResults({ runId, limit, offset });
  return c.json(result);
});

// Create run
runsRouter.post("/", async (c) => {
  const body = await c.req.json<{
    configId?: string;
    configVersion?: number;
    configSnapshot: Record<string, unknown>;
    totalTestCases?: number;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.configSnapshot) {
    return c.json({ error: "configSnapshot is required" }, 400);
  }

  const run = await createRun(body);
  return c.json(run, 201);
});

// Execute a benchmark run
runsRouter.post("/:id/execute", async (c) => {
  const runId = c.req.param("id");
  const log = createRunLogger({ runId, source: "routes/runs" });
  log.info("POST /runs/:id/execute called");

  const run = await getRun(runId);
  if (!run) {
    log.warn("Run not found");
    return c.json({ error: "Run not found" }, 404);
  }

  if (run.status !== "pending") {
    log.warn("Run is not pending", { status: run.status });
    return c.json({ error: `Run is already ${run.status}` }, 400);
  }

  const configSnapshot = run.configSnapshot as Record<string, unknown>;

  try {
    const config = await parseConfig(configSnapshot);

    if (run.configId) {
      await incrementRunCount(run.configId);
    }

    await executeRun({ runId, config, registries: getRegistries() });

    const updatedRun = await getRun(runId);
    return c.json(updatedRun);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.errorWithCause("Run execution failed", error);
    await updateRunStatus(runId, {
      status: "failed",
      completedAt: new Date(),
      errorMessage,
    });
    return c.json({ error: errorMessage }, 500);
  }
});

// Cancel a running benchmark
runsRouter.post("/:id/cancel", async (c) => {
  const runId = c.req.param("id");
  const log = createRunLogger({ runId, source: "routes/runs" });
  log.info("POST /runs/:id/cancel called");

  const run = await getRun(runId);
  if (!run) {
    log.warn("Run not found");
    return c.json({ error: "Run not found" }, 404);
  }

  if (run.status !== "running" && run.status !== "pending") {
    log.warn("Run is not cancellable", { status: run.status });
    return c.json({ error: `Run is already ${run.status}` }, 400);
  }

  await updateRunStatus(runId, {
    status: "partial",
    completedAt: new Date(),
  });

  log.info("Run cancelled", { runId });
  const updatedRun = await getRun(runId);
  return c.json(updatedRun);
});

// Create and execute run in one step
runsRouter.post("/execute", async (c) => {
  const log = createRunLogger({ source: "routes/runs" });
  log.info("POST /runs/execute called");
  const body = await c.req.json<{
    configId?: string;
    configSnapshot?: Record<string, unknown>;
  }>();

  log.info("Run execute request parsed", {
    hasConfigId: !!body.configId,
    hasConfigSnapshot: !!body.configSnapshot,
  });

  let configSnapshot = body.configSnapshot;
  let configId = body.configId;
  let configVersion: number | undefined;

  if (configId && !configSnapshot) {
    log.info("Loading config from DB", { configId });
    const config = await getConfig(configId);
    if (!config) {
      log.warn("Config not found", { configId });
      return c.json({ error: "Config not found" }, 404);
    }
    configSnapshot = config.configJson as Record<string, unknown>;
    configVersion = config.version;
    log.info("Config loaded", {
      configId,
      name: config.name,
      version: configVersion,
    });
  }

  if (!configSnapshot) {
    return c.json({ error: "configSnapshot or configId is required" }, 400);
  }

  try {
    const config = await parseConfig(configSnapshot);

    if (!configId) {
      const { config: dbConfig, created } =
        await findOrCreateConfig(configSnapshot);
      configId = dbConfig.id;
      configVersion = dbConfig.version;
      if (created) {
        log.info("Auto-saved new config", {
          configId: dbConfig.id,
          name: dbConfig.name,
          version: configVersion,
        });
      } else {
        log.info("Found existing config", {
          configId: dbConfig.id,
          name: dbConfig.name,
          version: configVersion,
        });
      }
    }

    const run = await createRun({
      configId,
      configVersion,
      configSnapshot,
      metadata: { triggeredBy: "web" },
    });
    const runLog = createRunLogger({ runId: run.id, source: "routes/runs" });
    runLog.info("Run created", { configId });

    if (configId) {
      await incrementRunCount(configId);
    }

    c.header("Location", `/api/runs/${run.id}/execute`);

    await executeRun({ runId: run.id, config, registries: getRegistries() });

    const updatedRun = await getRun(run.id);
    runLog.info("Run execute completed", { status: updatedRun?.status });
    return c.json(updatedRun, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.errorWithCause("Run execute failed", error);
    return c.json({ error: errorMessage }, 500);
  }
});
