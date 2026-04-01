/**
 * Langfuse Prompt Polling Service
 *
 * Polls Langfuse API for prompt updates and triggers test runs
 * when configured prompts change. Includes debounce logic to prevent
 * multiple triggers within a short time window.
 */

import { Langfuse } from "langfuse";
import { createHash, createHmac } from "crypto";
import {
  getConfig,
  createRun,
  incrementRunCount,
  updateRunStatus,
  getEnabledLangfuseTriggersByPrompt,
  updateLangfuseTriggerAfterRun,
  updateLangfuseTriggerRunStatus,
  updateLangfuseTriggerLastSeen,
  addPromptVersion,
  getAllHighestPromptVersions,
  getWatchedPromptNames,
  type LangfuseTrigger,
} from "./db";
import { executeRun, parseConfig } from "./run-executor";
import { getRegistries } from "./registry-context";

// Polling configuration
const DEFAULT_POLL_INTERVAL_MS = 30_000; // 30 seconds
let pollIntervalId: NodeJS.Timeout | null = null;
let isPolling = false;

// In-memory tracking of currently running triggers to prevent overlap
const runningTriggers = new Set<string>();

/**
 * Create Langfuse client from environment variables
 */
function createLangfuseClient(): Langfuse | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return null;
  }

  return new Langfuse({
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
  });
}

/**
 * SHA256 hash of content
 */
function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Result of a sync operation
 */
interface SyncResult {
  promptsChecked: number;
  newVersionsFound: number;
  triggersExecuted: number;
  errors: string[];
}

/**
 * Check if Langfuse is configured
 */
export function isLangfuseConfigured(): boolean {
  return !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

/**
 * Start the Langfuse poller
 */
export function startLangfusePoller(
  intervalMs: number = DEFAULT_POLL_INTERVAL_MS
): void {
  if (pollIntervalId) {
    console.log("[Langfuse Poller] Already running");
    return;
  }

  if (!isLangfuseConfigured()) {
    console.log("[Langfuse Poller] Langfuse not configured, skipping");
    return;
  }

  console.log(`[Langfuse Poller] Starting with ${intervalMs}ms interval`);

  // Run immediately
  pollLangfuse().catch((err) => {
    console.error("[Langfuse Poller] Initial poll error:", err);
  });

  // Then poll periodically
  pollIntervalId = setInterval(() => {
    pollLangfuse().catch((err) => {
      console.error("[Langfuse Poller] Poll error:", err);
    });
  }, intervalMs);
}

/**
 * Stop the Langfuse poller
 */
export function stopLangfusePoller(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    console.log("[Langfuse Poller] Stopped");
  }
}

/**
 * Main polling function - checks Langfuse for updates
 */
async function pollLangfuse(): Promise<SyncResult> {
  if (isPolling) {
    return {
      promptsChecked: 0,
      newVersionsFound: 0,
      triggersExecuted: 0,
      errors: ["Already polling"],
    };
  }

  isPolling = true;
  const result: SyncResult = {
    promptsChecked: 0,
    newVersionsFound: 0,
    triggersExecuted: 0,
    errors: [],
  };

  try {
    let langfuse: ReturnType<typeof createLangfuseClient>;
    try {
      langfuse = createLangfuseClient();
    } catch (clientErr) {
      const errMsg =
        clientErr instanceof Error
          ? clientErr.message
          : JSON.stringify(clientErr);
      console.error("[Langfuse Poller] Failed to create client:", errMsg);
      result.errors.push(`Client error: ${errMsg}`);
      return result;
    }

    if (!langfuse) {
      result.errors.push("Langfuse not configured");
      return result;
    }

    // Get watched prompt names (prompts that have triggers)
    let watchedPrompts: string[];
    try {
      watchedPrompts = await getWatchedPromptNames();
    } catch {
      // Database might not be ready yet on startup
      console.log("[Langfuse Poller] Database not ready, will retry next poll");
      return result;
    }
    if (watchedPrompts.length === 0) {
      // No triggers configured, nothing to poll
      return result;
    }

    // Get highest known versions for all prompts
    const knownVersions = await getAllHighestPromptVersions();

    // Fetch all prompts from Langfuse (with pagination)
    const allPrompts = await listLangfusePrompts();
    if (allPrompts.length === 0) {
      return result;
    }

    // Filter to only watched prompts
    const promptsToCheck = allPrompts.filter((p) =>
      watchedPrompts.includes(p.name)
    );
    result.promptsChecked = promptsToCheck.length;

    // Process each prompt
    for (const promptInfo of promptsToCheck) {
      const promptName = promptInfo.name;
      const versions = promptInfo.versions || [];

      if (versions.length === 0) continue;

      const highestVersion = Math.max(...versions);
      const knownHighest = knownVersions.get(promptName) || 0;

      // Check if there's a new version
      if (highestVersion > knownHighest) {
        result.newVersionsFound++;

        // Download the new version content
        try {
          const promptResponse = await langfuse.getPrompt(
            promptName,
            highestVersion
          );
          const promptContent =
            typeof promptResponse.prompt === "string"
              ? promptResponse.prompt
              : JSON.stringify(promptResponse.prompt);

          // Save the version to our tracking
          await addPromptVersion({
            promptName,
            version: highestVersion,
            labels: promptResponse.labels || [],
            contentHash: sha256(promptContent),
          });

          console.log(
            `[Langfuse Poller] New version: ${promptName} v${highestVersion}`
          );

          // Find triggers for this prompt and execute them
          const triggers = await getEnabledLangfuseTriggersByPrompt(promptName);
          for (const trigger of triggers) {
            const executed = await maybeExecuteTrigger(trigger, highestVersion);
            if (executed) {
              result.triggersExecuted++;
            }
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Failed to process ${promptName}: ${errMsg}`);
        }
      }
    }

    if (result.newVersionsFound > 0 || result.triggersExecuted > 0) {
      console.log(
        `[Langfuse Poller] Checked ${result.promptsChecked} prompts, ` +
          `found ${result.newVersionsFound} new versions, ` +
          `executed ${result.triggersExecuted} triggers`
      );
    }

    return result;
  } catch (error) {
    const errMsg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
    result.errors.push(errMsg);
    console.error("[Langfuse Poller] Error:", errMsg);
    return result;
  } finally {
    isPolling = false;
  }
}

/**
 * Execute a trigger with debounce check
 * Returns true if trigger was executed, false if debounced
 */
async function maybeExecuteTrigger(
  trigger: LangfuseTrigger,
  version: number
): Promise<boolean> {
  // Check if this trigger is already running
  if (runningTriggers.has(trigger.id)) {
    console.log(
      `[Langfuse Poller] Trigger ${trigger.name} already running, skipping`
    );
    return false;
  }

  // Check debounce - don't trigger if last trigger was within debounce window
  if (trigger.lastTriggeredAt) {
    const lastTriggered = new Date(trigger.lastTriggeredAt).getTime();
    const debounceMs = (trigger.debounceSeconds || 30) * 1000;
    const now = Date.now();

    if (now - lastTriggered < debounceMs) {
      console.log(
        `[Langfuse Poller] Trigger ${trigger.name} debounced ` +
          `(${Math.round((now - lastTriggered) / 1000)}s < ${trigger.debounceSeconds}s)`
      );
      // Update last seen version even if debounced
      await updateLangfuseTriggerLastSeen(trigger.id, version);
      return false;
    }
  }

  // Execute the trigger
  runningTriggers.add(trigger.id);
  try {
    console.log(
      `[Langfuse Poller] Executing trigger: ${trigger.name} for prompt v${version}`
    );
    await executeLangfuseTrigger(trigger, version);
    return true;
  } finally {
    runningTriggers.delete(trigger.id);
  }
}

/**
 * Execute a single Langfuse trigger - creates and runs the associated config
 */
async function executeLangfuseTrigger(
  trigger: LangfuseTrigger,
  version: number
): Promise<void> {
  try {
    // Get the config
    const dbConfig = await getConfig(trigger.configId);
    if (!dbConfig) {
      console.error(
        `[Langfuse Poller] Config ${trigger.configId} not found for trigger ${trigger.name}`
      );
      return;
    }

    // Parse and validate config
    const configSnapshot = dbConfig.configJson as Record<string, unknown>;
    const config = await parseConfig(configSnapshot);

    // Create a new run
    const run = await createRun({
      configId: dbConfig.id,
      configSnapshot,
      metadata: {
        triggeredBy: "langfuse",
        triggerId: trigger.id,
        triggerName: trigger.name,
        promptName: trigger.promptName,
        promptVersion: version,
      },
    });

    console.log(
      `[Langfuse Poller] Created run ${run.id} for trigger ${trigger.name}`
    );

    // Update trigger state
    await updateLangfuseTriggerAfterRun(trigger.id, {
      lastTriggeredAt: new Date(),
      lastTriggeredVersion: version,
      lastRunId: run.id,
      lastRunStatus: "running",
    });

    // Increment config run count
    await incrementRunCount(dbConfig.id);

    // Execute the run (fire-and-forget)
    executeRun({ runId: run.id, config, registries: getRegistries() })
      .then(async () => {
        // Update trigger status only (don't increment counter again)
        await updateLangfuseTriggerRunStatus(trigger.id, {
          lastRunStatus: "completed",
        });
        console.log(
          `[Langfuse Poller] Run ${run.id} completed for trigger ${trigger.name}`
        );
      })
      .catch(async (err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Langfuse Poller] Run ${run.id} failed:`, errorMsg);
        await updateRunStatus(run.id, {
          status: "failed",
          errorMessage: errorMsg,
        });
        // Update trigger status only (don't increment counter again)
        await updateLangfuseTriggerRunStatus(trigger.id, {
          lastRunStatus: "failed",
        });
      });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Langfuse Poller] Failed to execute trigger ${trigger.name}:`,
      errorMsg
    );
  }
}

/**
 * Manually trigger a sync (for API endpoint)
 */
export async function manualLangfuseSync(): Promise<SyncResult> {
  if (!isLangfuseConfigured()) {
    return {
      promptsChecked: 0,
      newVersionsFound: 0,
      triggersExecuted: 0,
      errors: ["Langfuse not configured"],
    };
  }
  return pollLangfuse();
}

/**
 * Get available prompts from Langfuse (for UI dropdown)
 * Fetches all pages to get complete list
 */
export async function listLangfusePrompts(): Promise<
  Array<{ name: string; versions: number[]; tags?: string[] }>
> {
  if (!isLangfuseConfigured()) {
    return [];
  }

  const baseUrl = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";
  const authHeader = `Basic ${Buffer.from(
    `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
  ).toString("base64")}`;

  const allPrompts: Array<{
    name: string;
    versions: number[];
    tags?: string[];
  }> = [];
  let page = 1;
  const limit = 100; // Max per page
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `${baseUrl}/api/public/v2/prompts?page=${page}&limit=${limit}`;
      const response = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        console.error(
          `[Langfuse] Failed to fetch prompts page ${page}: ${response.status}`
        );
        break;
      }

      const data = (await response.json()) as {
        data?: Array<{ name: string; versions: number[]; tags?: string[] }>;
        meta?: {
          page: number;
          limit: number;
          totalItems: number;
          totalPages: number;
        };
      };

      if (data?.data && data.data.length > 0) {
        allPrompts.push(...data.data);
      }

      // Check if there are more pages
      if (data?.meta) {
        hasMore = page < data.meta.totalPages;
        page++;
      } else {
        // No meta, assume single page
        hasMore = false;
      }

      // Safety limit to prevent infinite loops
      if (page > 50) {
        console.warn(
          "[Langfuse] Reached max page limit (50) when fetching prompts"
        );
        break;
      }
    }

    console.log(
      `[Langfuse] Fetched ${allPrompts.length} prompts from ${page - 1} pages`
    );
    return allPrompts;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Langfuse] Error fetching prompts:", errMsg);
    return allPrompts; // Return what we have so far
  }
}

// ============ Webhook Handler ============

/**
 * Langfuse webhook payload structure
 */
export interface LangfuseWebhookPayload {
  id: string;
  timestamp: string;
  type: "prompt-version";
  apiVersion: string;
  action: "created" | "updated" | "deleted";
  prompt: {
    id: string;
    name: string;
    version: number;
    projectId: string;
    labels: string[];
    prompt: string | object;
    type: string;
    config?: Record<string, unknown>;
    commitMessage?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Result of processing a webhook
 */
export interface WebhookResult {
  success: boolean;
  message: string;
  triggersExecuted: number;
  promptName?: string;
  promptVersion?: number;
  action?: string;
}

/**
 * Verify Langfuse webhook signature
 * The signature format is: t=timestamp,s=signature
 */
export function verifyLangfuseSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    const [tsPair, sigPair] = signatureHeader.split(",");
    if (!tsPair || !sigPair) return false;

    const timestamp = tsPair.split("=")[1];
    const receivedSig = sigPair.split("=")[1];

    if (!timestamp || !receivedSig) return false;

    const expectedSig = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`, "utf8")
      .digest("hex");

    // Use timing-safe comparison
    if (receivedSig.length !== expectedSig.length) return false;

    let result = 0;
    for (let i = 0; i < receivedSig.length; i++) {
      result |= receivedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Handle incoming Langfuse webhook
 * Processes prompt version events and triggers associated runs
 */
export async function handleLangfuseWebhook(
  payload: LangfuseWebhookPayload
): Promise<WebhookResult> {
  const { action, prompt } = payload;
  const promptName = prompt.name;
  const version = prompt.version;

  console.log(
    `[Langfuse Webhook] Received ${action} event for prompt "${promptName}" v${version}`
  );

  // Only process created/updated events (not deleted)
  if (action === "deleted") {
    return {
      success: true,
      message: "Deleted events are ignored",
      triggersExecuted: 0,
      promptName,
      promptVersion: version,
      action,
    };
  }

  try {
    // Get content for hashing
    const promptContent =
      typeof prompt.prompt === "string"
        ? prompt.prompt
        : JSON.stringify(prompt.prompt);

    // Save the version to our tracking
    await addPromptVersion({
      promptName,
      version,
      labels: prompt.labels || [],
      contentHash: sha256(promptContent),
    });

    // Find enabled triggers for this prompt
    const triggers = await getEnabledLangfuseTriggersByPrompt(promptName);

    if (triggers.length === 0) {
      console.log(
        `[Langfuse Webhook] No enabled triggers for prompt "${promptName}"`
      );
      return {
        success: true,
        message: `No triggers configured for prompt "${promptName}"`,
        triggersExecuted: 0,
        promptName,
        promptVersion: version,
        action,
      };
    }

    // Execute each trigger
    let triggersExecuted = 0;
    for (const trigger of triggers) {
      const executed = await maybeExecuteTrigger(trigger, version);
      if (executed) {
        triggersExecuted++;
      }
    }

    console.log(
      `[Langfuse Webhook] Processed prompt "${promptName}" v${version}, ` +
        `executed ${triggersExecuted}/${triggers.length} triggers`
    );

    return {
      success: true,
      message: `Executed ${triggersExecuted} trigger(s)`,
      triggersExecuted,
      promptName,
      promptVersion: version,
      action,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Langfuse Webhook] Error processing webhook:`, errMsg);
    return {
      success: false,
      message: errMsg,
      triggersExecuted: 0,
      promptName,
      promptVersion: version,
      action,
    };
  }
}
