import { Hono } from "hono";
import {
  getTriggersWithConfigs,
  getTrigger,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  listConfigs,
} from "../lib/db";
import { fireTrigger } from "../lib/trigger-poller";

export const triggersRouter = new Hono();

// List triggers with config names
triggersRouter.get("/", async (c) => {
  const search = c.req.query("search");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await getTriggersWithConfigs({ search, limit, offset });
  return c.json(result);
});

// Get single trigger
triggersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const trigger = await getTrigger(id);

  if (!trigger) {
    return c.json({ error: "Trigger not found" }, 404);
  }

  return c.json(trigger);
});

// Create trigger
triggersRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name: string;
    configId: string;
    intervalSeconds: number;
    enabled?: boolean;
    skipIfRecentRunSeconds?: number | null;
  }>();

  if (!body.name || !body.configId || !body.intervalSeconds) {
    return c.json(
      { error: "name, configId, and intervalSeconds are required" },
      400
    );
  }

  if (body.intervalSeconds < 1) {
    return c.json({ error: "intervalSeconds must be at least 1" }, 400);
  }

  if (body.skipIfRecentRunSeconds !== undefined && body.skipIfRecentRunSeconds !== null && body.skipIfRecentRunSeconds < 0) {
    return c.json({ error: "skipIfRecentRunSeconds must be non-negative" }, 400);
  }

  const trigger = await createTrigger(body);
  return c.json(trigger, 201);
});

// Update trigger
triggersRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    configId?: string;
    intervalSeconds?: number;
    enabled?: boolean;
    skipIfRecentRunSeconds?: number | null;
  }>();

  if (body.intervalSeconds !== undefined && body.intervalSeconds < 1) {
    return c.json({ error: "intervalSeconds must be at least 1" }, 400);
  }

  if (body.skipIfRecentRunSeconds !== undefined && body.skipIfRecentRunSeconds !== null && body.skipIfRecentRunSeconds < 0) {
    return c.json({ error: "skipIfRecentRunSeconds must be non-negative" }, 400);
  }

  const trigger = await updateTrigger(id, body);

  if (!trigger) {
    return c.json({ error: "Trigger not found" }, 404);
  }

  return c.json(trigger);
});

// Delete trigger
triggersRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await deleteTrigger(id);
  return c.json({ success: true });
});

// Get configs for dropdown (helper endpoint)
triggersRouter.get("/meta/configs", async (c) => {
  const result = await listConfigs({ limit: 200 });
  return c.json({
    configs: result.configs.map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
    })),
  });
});

// Manually fire a trigger
triggersRouter.post("/:id/fire", async (c) => {
  const id = c.req.param("id");
  const result = await fireTrigger(id);

  if (!result.success) {
    return c.json({ error: result.error }, result.error === "Trigger not found" ? 404 : 500);
  }

  return c.json({ success: true, runId: result.runId }, 202);
});
