import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import type { ProviderEntry, RunnerEntry, ScorerEntry, StorageEntry } from "@peerbench/core";
import { createRegistry } from "@peerbench/core";

type PeerBenchConfig = {
  database: string;
  port?: number;
  providers?: Record<string, ProviderEntry>;
  runners?: Record<string, RunnerEntry>;
  scorers?: Record<string, ScorerEntry>;
  storages?: Record<string, StorageEntry>;
  entityRenderers?: Record<string, unknown>;
  routes?: (app: Hono) => void;
  cors?: string;
};

class PeerBench {
  private readonly config: PeerBenchConfig;
  private server: ServerType | null = null;
  readonly app: Hono;

  readonly providerRegistry;
  readonly runnerRegistry;
  readonly scorerRegistry;
  readonly storageRegistry;

  constructor(config: PeerBenchConfig) {
    this.config = config;
    this.app = new Hono();

    this.providerRegistry = createRegistry(config.providers ?? {});
    this.runnerRegistry = createRegistry(config.runners ?? {});
    this.scorerRegistry = createRegistry(config.scorers ?? {});
    this.storageRegistry = createRegistry(config.storages ?? {});

    this.setupMiddleware();

    if (config.routes) {
      config.routes(this.app);
    }
  }

  private setupMiddleware() {
    this.app.use(
      "*",
      cors({
        origin: this.config.cors ?? "*",
        allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowHeaders: ["Content-Type", "Authorization"],
      }),
    );
  }

  async start(): Promise<void> {
    const port = this.config.port ?? 3055;

    this.app.get("/api/health", (c) =>
      c.json({ status: "ok", timestamp: new Date().toISOString() }),
    );

    this.app.notFound((c) =>
      c.json({ error: "Not found", path: c.req.path }, 404),
    );

    this.app.onError((err, c) => {
      console.error("Unhandled error:", err);
      return c.json({ error: "Internal server error" }, 500);
    });

    this.server = serve({ fetch: this.app.fetch, port }, (info) => {
      console.log(`PeerBench server running on http://localhost:${info.port}`);
    });

    const shutdown = () => {
      console.log("Shutting down PeerBench server...");
      if (this.server) {
        this.server.close();
      }
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export { PeerBench, type PeerBenchConfig };
