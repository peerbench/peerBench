import { Hono } from "hono";
import {
  createRun,
  getConfig,
  incrementRunCount,
  listConfigs,
  getRun,
} from "../lib/db";
import { type RunConfig } from "@peerbench/core";
import {
  executeRun,
  parseConfig,
  type ExecutionOptions,
} from "../lib/run-executor";
import { createRunLogger } from "../lib/logger";
import { getRegistries } from "../lib/registry-context";

export const quickTestRouter = new Hono();

export type QuickTestOptions = {
  maxTestCasesPerConfig?: number;
  endpointBaseOverride?: string;
};

export type QuickTestRequest = {
  configIds: string[];
  options?: QuickTestOptions;
};

export type QuickTestRunResult = {
  configId: string;
  configName: string;
  runId: string;
  status: "created" | "running" | "completed" | "failed" | "partial";
  error?: string;
};

// Get favorite configs for quick selection
quickTestRouter.get("/favorites", async (c) => {
  const result = await listConfigs({ favoritesOnly: true, limit: 100 });
  return c.json({
    configs: result.configs.map((config) => ({
      id: config.id,
      name: config.name,
      description: config.description,
      runner: (config.configJson as Record<string, unknown>)?.runner,
      tags: config.tags,
    })),
  });
});

// Execute quick test for multiple configs
quickTestRouter.post("/execute", async (c) => {
  const log = createRunLogger({ source: "routes/quick-test" });
  log.info("POST /quick-test/execute called");

  const body = await c.req.json<QuickTestRequest>();
  const { configIds, options = {} } = body;

  if (!configIds || configIds.length === 0) {
    return c.json(
      { error: "configIds array is required and must not be empty" },
      400
    );
  }

  log.info("Quick test request", {
    configCount: configIds.length,
    options,
  });

  const results: QuickTestRunResult[] = [];

  for (const configId of configIds) {
    const config = await getConfig(configId);
    if (!config) {
      results.push({
        configId,
        configName: "Unknown",
        runId: "",
        status: "failed",
        error: "Config not found",
      });
      continue;
    }

    try {
      let configSnapshot = config.configJson as Record<string, unknown>;

      // Extract and store original endpoints before overwriting
      let originalEndpoints: Record<string, string> | undefined;
      if (options.endpointBaseOverride) {
        originalEndpoints = extractEndpointsFromConfig(configSnapshot);
        configSnapshot = applyEndpointOverride(
          configSnapshot,
          options.endpointBaseOverride
        );
      }

      const parsedConfig = await parseConfig(configSnapshot);

      // Create run with practice run metadata
      const run = await createRun({
        configId: config.id,
        configVersion: config.version,
        configSnapshot,
        metadata: {
          triggeredBy: "quick-test",
          isPracticeRun: true,
          quickTestOptions: options,
          ...(originalEndpoints && { originalEndpoints }),
        },
      });

      results.push({
        configId: config.id,
        configName: config.name,
        runId: run.id,
        status: "created",
      });

      // Increment run count
      await incrementRunCount(config.id);

      // Execute in background (don't await)
      executeRunWithOptions(run.id, parsedConfig, options, log).catch(
        (error) => {
          log.errorWithCause("Quick test execution failed", error, {
            runId: run.id,
            configId: config.id,
          });
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.errorWithCause("Failed to create quick test run", error, {
        configId,
      });
      results.push({
        configId: config.id,
        configName: config.name,
        runId: "",
        status: "failed",
        error: errorMessage,
      });
    }
  }

  return c.json({ runs: results }, 201);
});

// Get status of quick test runs
quickTestRouter.get("/status", async (c) => {
  const runIdsParam = c.req.query("runIds");
  if (!runIdsParam) {
    return c.json({ error: "runIds query parameter is required" }, 400);
  }

  const runIds = runIdsParam.split(",").filter(Boolean);
  const statuses = await Promise.all(
    runIds.map(async (runId) => {
      const run = await getRun(runId);
      if (!run) {
        return { runId, status: "not_found" as const };
      }
      return {
        runId,
        status: run.status,
        completedTestCases: run.completedTestCases,
        totalTestCases: run.totalTestCases,
        avgScore: run.avgScore,
      };
    })
  );

  return c.json({ statuses });
});

function applyEndpointOverride(
  configSnapshot: Record<string, unknown>,
  endpointBaseOverride: string
): Record<string, unknown> {
  const targets = configSnapshot.targets as
    | Array<Record<string, unknown>>
    | undefined;
  if (!targets) return configSnapshot;

  const updatedTargets = targets.map((target) => {
    const params = target.params as Record<string, unknown> | undefined;
    if (!params) return target;

    // Check if there's an endpoint param to override
    const currentEndpoint = params.endpoint as string | undefined;
    if (!currentEndpoint) return target;

    // Parse the current endpoint to extract the path
    const newEndpoint = replaceEndpointBase(
      currentEndpoint,
      endpointBaseOverride
    );

    return {
      ...target,
      params: {
        ...params,
        endpoint: newEndpoint,
      },
    };
  });

  return {
    ...configSnapshot,
    targets: updatedTargets,
  };
}

function replaceEndpointBase(currentEndpoint: string, newBase: string): string {
  try {
    const currentUrl = new URL(currentEndpoint);
    const newBaseUrl = new URL(newBase);

    // Replace protocol, host, and port, keep the path
    return `${newBaseUrl.protocol}//${newBaseUrl.host}${currentUrl.pathname}`;
  } catch {
    // If URL parsing fails, just return the new base (user might want full override)
    return newBase;
  }
}

function extractEndpointsFromConfig(
  configSnapshot: Record<string, unknown>
): Record<string, string> {
  const endpoints: Record<string, string> = {};
  const targets = configSnapshot.targets as
    | Array<Record<string, unknown>>
    | undefined;
  if (!targets) return endpoints;

  for (const target of targets) {
    const params = target.params as Record<string, unknown> | undefined;
    if (!params) continue;

    const endpoint = params.endpoint as string | undefined;
    if (!endpoint) continue;

    const targetId =
      (target.id as string) || (target.name as string) || "unknown";
    endpoints[targetId] = endpoint;
  }

  return endpoints;
}

async function executeRunWithOptions(
  runId: string,
  config: RunConfig,
  options: QuickTestOptions,
  log: ReturnType<typeof createRunLogger>
): Promise<void> {
  const executionOptions: ExecutionOptions = {};
  if (options.maxTestCasesPerConfig) {
    executionOptions.maxTestCases = options.maxTestCasesPerConfig;
  }

  await executeRun({ runId, config, registries: getRegistries(), options: executionOptions });

  const updatedRun = await getRun(runId);
  log.info("Quick test run completed", {
    runId,
    status: updatedRun?.status,
    avgScore: updatedRun?.avgScore,
  });
}
