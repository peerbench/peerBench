import { Hono } from "hono";
import {
  listConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  duplicateConfig,
  incrementRunCount,
  toggleConfigFavorite,
  ensureAgentsFromConfig,
  getConfigVersions,
} from "../lib/db";
import { validateRunConfig } from "@peerbench/core";

export const configsRouter = new Hono();

// List configs
configsRouter.get("/", async (c) => {
  const search = c.req.query("search");
  const tagsParam = c.req.query("tags");
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;
  const tagMode = c.req.query("tagMode") as "and" | "or" | undefined;
  const orderBy = c.req.query("orderBy") as
    | "runCount"
    | "createdAt"
    | "name"
    | undefined;
  const favoritesOnly = c.req.query("favoritesOnly") === "true";
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await listConfigs({
    search,
    tags,
    tagMode,
    orderBy,
    favoritesOnly,
    limit,
    offset,
  });
  return c.json(result);
});

// Get single config
configsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const config = await getConfig(id);

  if (!config) {
    return c.json({ error: "Config not found" }, 404);
  }

  return c.json(config);
});

// Create config
configsRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name: string;
    description?: string;
    configJson: Record<string, unknown>;
    tags?: string[];
    createdBy?: string;
  }>();

  if (!body.name || !body.configJson) {
    return c.json({ error: "name and configJson are required" }, 400);
  }

  const validation = validateRunConfig(body.configJson);
  if (!validation.valid) {
    return c.json(
      { error: "Config validation failed", errors: validation.errors },
      400
    );
  }

  const config = await createConfig(body);

  try {
    await ensureAgentsFromConfig({ configJson: body.configJson });
  } catch (error) {
    console.warn(
      `[Configs] Failed to sync agents from config "${body.name}":`,
      error
    );
  }

  return c.json(config, 201);
});

// Update config
configsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    description?: string;
    configJson?: Record<string, unknown>;
    tags?: string[];
  }>();

  if (body.configJson) {
    const validation = validateRunConfig(body.configJson);
    if (!validation.valid) {
      return c.json(
        { error: "Config validation failed", errors: validation.errors },
        400
      );
    }
  }

  const config = await updateConfig(id, body);

  if (!config) {
    return c.json({ error: "Config not found" }, 404);
  }

  if (body.configJson) {
    try {
      await ensureAgentsFromConfig({ configJson: body.configJson });
    } catch (error) {
      console.warn(
        `[Configs] Failed to sync agents from updated config:`,
        error
      );
    }
  }

  return c.json(config);
});

// Delete config
configsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await deleteConfig(id);
  return c.json({ success: true });
});

// Duplicate config
configsRouter.post("/:id/duplicate", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ newName: string }>();

  if (!body.newName) {
    return c.json({ error: "newName is required" }, 400);
  }

  const config = await duplicateConfig(id, body.newName);

  if (!config) {
    return c.json({ error: "Config not found" }, 404);
  }

  return c.json(config, 201);
});

// Increment run count
configsRouter.post("/:id/increment-run-count", async (c) => {
  const id = c.req.param("id");
  await incrementRunCount(id);
  return c.json({ success: true });
});

// Get all versions for a config group
configsRouter.get("/:id/versions", async (c) => {
  const id = c.req.param("id");
  const versions = await getConfigVersions(id);

  if (versions.length === 0) {
    return c.json({ error: "Config not found" }, 404);
  }

  return c.json({ versions });
});

// Toggle favorite status
configsRouter.post("/:id/toggle-favorite", async (c) => {
  const id = c.req.param("id");
  const config = await toggleConfigFavorite(id);

  if (!config) {
    return c.json({ error: "Config not found" }, 404);
  }

  return c.json(config);
});
