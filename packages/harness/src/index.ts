import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { agentsRouter } from "./routes/agents";
import { configsRouter } from "./routes/configs";
import { runsRouter } from "./routes/runs";
import { statsRouter } from "./routes/stats";
import { benchmarkMetaRouter } from "./routes/benchmark-meta";
import { localConfigsRouter } from "./routes/local-configs";
import { triggersRouter } from "./routes/triggers";
import { langfuseTriggersRouter } from "./routes/langfuse-triggers";
import { resultsRouter } from "./routes/results";
import { quickTestRouter } from "./routes/quick-test";
import { feedbackRouter } from "./routes/feedback";
import { logger } from "./lib/logger";
import { startTriggerPoller, stopTriggerPoller } from "./lib/trigger-poller";
import { startLangfusePoller, stopLangfusePoller } from "./lib/langfuse-poller";
import { markInProgressRunsAsPartial } from "./lib/db";

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/api/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

const KNOWN_ENV_VARS = [
  "NODE_ENV",
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LANGFUSE_HOST",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "MASTRA_ENDPOINT",
  "MASTRA_API_KEY",
  "MASTRA_BEARER_TOKEN",
  "OPENROUTER_API_KEY",
  "OPENROUTER_KEY",
  "LLM_JUDGE_API_KEY",
  "LLM_JUDGE_MODEL",
  "DQ_SUPABASE_URL",
  "DQ_SUPABASE_KEY",
  "DQ_SUPABASE_ANON_KEY",
];

// Return just the names of known/app-relevant env vars (no values)
app.get("/api/env-names", (c) => {
  const available = KNOWN_ENV_VARS.filter(
    (name) => process.env[name] !== undefined
  );
  return c.json({ names: available });
});

// Return obfuscated env var values for admin debugging
app.get("/api/env-debug", (c) => {
  const entries = KNOWN_ENV_VARS.map((name) => {
    const value = process.env[name];
    if (value === undefined) {
      return { name, status: "unset" as const, obfuscated: null };
    }
    if (value.length < 10) {
      return { name, status: "short" as const, obfuscated: null };
    }
    const obfuscated =
      value[0] + "*".repeat(value.length - 4) + value.slice(-3);
    return { name, status: "set" as const, obfuscated };
  });

  return c.json({ entries });
});

// API routes
app.route("/api/agents", agentsRouter);
app.route("/api/configs", configsRouter);
app.route("/api/runs", runsRouter);
app.route("/api/stats", statsRouter);
app.route("/api/benchmark-meta", benchmarkMetaRouter);
app.route("/api/local-configs", localConfigsRouter);
app.route("/api/triggers", triggersRouter);
app.route("/api/langfuse-triggers", langfuseTriggersRouter);
app.route("/api/results", resultsRouter);
app.route("/api/quick-test", quickTestRouter);
app.route("/api/feedback", feedbackRouter);

// 404 handler
app.notFound((c) => c.json({ error: "Not Found" }, 404));

// Error handler
app.onError((err, c) => {
  logger.error({ err }, "Unhandled error");
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

const basePort = parseInt(process.env.PORT || "3055", 10);
const maxPortAttempts = 10;

async function startServer(port: number, attempt: number = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info({ port }, "Starting server");

    const server = serve({
      fetch: app.fetch,
      port,
    });

    server.on("listening", async () => {
      logger.info({ port }, "Server listening");

      // Mark any leftover in-progress runs as partial
      try {
        const updatedCount = await markInProgressRunsAsPartial();
        if (updatedCount > 0) {
          logger.info(
            { count: updatedCount },
            "Marked in-progress runs as partial"
          );
        }
      } catch (err) {
        logger.error({ err }, "Failed to mark in-progress runs as partial");
      }

      // Start pollers after server is listening
      startTriggerPoller();
      startLangfusePoller();

      // Graceful shutdown
      process.on("SIGTERM", () => {
        logger.info("SIGTERM received, shutting down...");
        stopTriggerPoller();
        stopLangfusePoller();
        server.close(() => {
          logger.info("Server closed");
          process.exit(0);
        });
      });

      process.on("SIGINT", () => {
        logger.info("SIGINT received, shutting down...");
        stopTriggerPoller();
        stopLangfusePoller();
        server.close(() => {
          logger.info("Server closed");
          process.exit(0);
        });
      });

      resolve();
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.warn({ port }, "Port in use, trying next");
        if (attempt < maxPortAttempts) {
          server.close();
          startServer(port + 1, attempt + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(
            new Error(
              `Could not find available port after ${maxPortAttempts} attempts`
            )
          );
        }
      } else {
        reject(err);
      }
    });
  });
}

startServer(basePort).catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
