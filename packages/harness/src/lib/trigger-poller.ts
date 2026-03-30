/**
 * Trigger Poller Service
 *
 * Polls the database for triggers that are due to run and executes them.
 * Runs in-process using setInterval.
 */

import { logger } from "./logger";
import {
  getDueTriggers,
  claimTrigger,
  updateTriggerAfterRun,
  createRun,
  incrementRunCount,
  updateRunStatus,
  getRecentRunForConfig,
} from "./db";
import { executeRun, parseConfig } from "./run-executor";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollerInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

/**
 * Start the trigger poller
 */
export function startTriggerPoller(): void {
  if (pollerInterval) {
    logger.warn("[TriggerPoller] Poller already running");
    return;
  }

  logger.info(
    { pollIntervalMs: POLL_INTERVAL_MS },
    "[TriggerPoller] Starting trigger poller"
  );

  // Run immediately on start
  void pollTriggers();

  // Then run on interval
  pollerInterval = setInterval(() => {
    void pollTriggers();
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the trigger poller
 */
export function stopTriggerPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("[TriggerPoller] Stopped trigger poller");
  }
}

/**
 * Poll for due triggers and execute them
 */
async function pollTriggers(): Promise<void> {
  // Prevent overlapping polls
  if (isPolling) {
    logger.debug("[TriggerPoller] Skip poll - already polling");
    return;
  }

  isPolling = true;

  try {
    let dueTriggers;
    try {
      dueTriggers = await getDueTriggers();
    } catch {
      // Database might not be ready yet on startup
      logger.debug("[TriggerPoller] Database not ready, will retry next poll");
      return;
    }

    if (dueTriggers.length === 0) {
      logger.debug("[TriggerPoller] No due triggers found");
      return;
    }

    logger.info(
      { count: dueTriggers.length, triggerIds: dueTriggers.map((t) => t.id) },
      "[TriggerPoller] Found due triggers"
    );

    // Fire all triggers concurrently (fire-and-forget)
    for (const trigger of dueTriggers) {
      // Don't await - let them run concurrently
      void executeTrigger(trigger.id);
    }
  } catch (error) {
    logger.error({ err: error }, "[TriggerPoller] Error polling for triggers");
  } finally {
    isPolling = false;
  }
}

/**
 * Execute a single trigger
 */
async function executeTrigger(triggerId: string): Promise<void> {
  logger.info({ triggerId }, "[TriggerPoller] Executing trigger");

  try {
    // Claim the trigger and get config
    const claimed = await claimTrigger(triggerId);
    if (!claimed) {
      logger.warn({ triggerId }, "[TriggerPoller] Failed to claim trigger");
      return;
    }

    const { trigger, config: dbConfig } = claimed;
    const configSnapshot = dbConfig.configJson as Record<string, unknown>;

    logger.info(
      {
        triggerId,
        triggerName: trigger.name,
        configId: dbConfig.id,
        configName: dbConfig.name,
      },
      "[TriggerPoller] Trigger claimed"
    );

    // Check if we should skip due to recent run
    if (trigger.skipIfRecentRunSeconds && trigger.skipIfRecentRunSeconds > 0) {
      const recentRun = await getRecentRunForConfig(
        dbConfig.id,
        trigger.skipIfRecentRunSeconds
      );
      if (recentRun) {
        const ageSeconds = Math.round(
          (Date.now() - new Date(recentRun.createdAt).getTime()) / 1000
        );
        logger.info(
          {
            triggerId,
            triggerName: trigger.name,
            configId: dbConfig.id,
            recentRunId: recentRun.id,
            recentRunAgeSeconds: ageSeconds,
            skipIfRecentRunSeconds: trigger.skipIfRecentRunSeconds,
          },
          "[TriggerPoller] Skipping trigger - config was run recently"
        );
        return;
      }
    }

    // Parse and validate config
    const config = await parseConfig(configSnapshot);

    // Create run record
    const run = await createRun({
      configId: dbConfig.id,
      configVersion: dbConfig.version,
      configSnapshot,
      metadata: {
        triggeredBy: "trigger",
        triggerId: trigger.id,
        triggerName: trigger.name,
      },
    });

    logger.info(
      { triggerId, runId: run.id },
      "[TriggerPoller] Run created for trigger"
    );

    // Increment config run count
    await incrementRunCount(dbConfig.id);

    // Execute run (don't await to avoid blocking)
    executeRun({ runId: run.id, config })
      .then(async (result) => {
        logger.info(
          {
            triggerId,
            runId: run.id,
            status: result.status,
            successCount: result.successCount,
            failedCount: result.failedCount,
          },
          "[TriggerPoller] Run completed"
        );

        // Update trigger with run result
        await updateTriggerAfterRun(triggerId, {
          runId: run.id,
          status: result.status === "completed" ? "completed" : "failed",
        });
      })
      .catch(async (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error({ err: error }, "[TriggerPoller] Run execution failed", {
          triggerId,
          runId: run.id,
        });

        // Update run as failed
        await updateRunStatus(run.id, {
          status: "failed",
          completedAt: new Date(),
          errorMessage,
        });

        // Update trigger with failure
        await updateTriggerAfterRun(triggerId, {
          runId: run.id,
          status: "failed",
        });
      });
  } catch (error) {
    logger.error({ err: error }, "[TriggerPoller] Failed to execute trigger", {
      triggerId,
    });
  }
}

/**
 * Manually fire a trigger (for API use)
 */
export async function fireTrigger(triggerId: string): Promise<{
  success: boolean;
  runId?: string;
  error?: string;
}> {
  logger.info({ triggerId }, "[TriggerPoller] Manual trigger fire requested");

  try {
    const claimed = await claimTrigger(triggerId);
    if (!claimed) {
      return { success: false, error: "Trigger not found" };
    }

    const { trigger, config: dbConfig } = claimed;
    const configSnapshot = dbConfig.configJson as Record<string, unknown>;
    const config = await parseConfig(configSnapshot);

    const run = await createRun({
      configId: dbConfig.id,
      configVersion: dbConfig.version,
      configSnapshot,
      metadata: {
        triggeredBy: "manual",
        triggerId: trigger.id,
        triggerName: trigger.name,
      },
    });

    await incrementRunCount(dbConfig.id);

    // Fire and forget
    executeRun({ runId: run.id, config })
      .then(async (result) => {
        await updateTriggerAfterRun(triggerId, {
          runId: run.id,
          status: result.status === "completed" ? "completed" : "failed",
        });
      })
      .catch(async (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await updateRunStatus(run.id, {
          status: "failed",
          completedAt: new Date(),
          errorMessage,
        });
        await updateTriggerAfterRun(triggerId, {
          runId: run.id,
          status: "failed",
        });
      });

    return { success: true, runId: run.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, "[TriggerPoller] Manual trigger fire failed");
    return { success: false, error: errorMessage };
  }
}
