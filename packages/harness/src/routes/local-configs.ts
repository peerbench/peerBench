import { Hono } from "hono";
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { validateRunConfig } from "@peerbench/core";
import { getRegistries } from "../lib/registry-context";
import { createConfig, ensureAgentsFromConfig } from "../lib/db";
import { fileExists } from "../utils/file-exists";
import { readJsonFile } from "../utils/read-json-file";

export const localConfigsRouter = new Hono();

const STANDALONE_CONFIG_DIRS = ["../../data/configs"];

function getRunnerParams(
  config: Record<string, unknown>
): Record<string, unknown> {
  const rp = config.runnerParams;
  if (typeof rp === "object" && rp !== null && !Array.isArray(rp)) {
    return rp as Record<string, unknown>;
  }
  return {};
}

function configMatchesFilters(
  config: Record<string, unknown>,
  filters: { agent?: string; runner?: string; provider?: string }
): boolean {
  if (filters.runner && config.runner !== filters.runner) return false;

  const targets = Array.isArray(config.targets)
    ? config.targets.filter(
        (v): v is Record<string, unknown> => typeof v === "object" && v !== null
      )
    : [];

  if (filters.provider) {
    if (!targets.some((t) => t.provider === filters.provider)) return false;
  }

  if (filters.agent) {
    const models = targets
      .map((t) => (typeof t.model === "string" ? t.model : ""))
      .filter(Boolean);
    if (
      !models.some((m) =>
        m.toLowerCase().includes(filters.agent!.toLowerCase())
      )
    ) {
      return false;
    }
  }

  return true;
}

localConfigsRouter.get("/", async (c) => {
  const filters = {
    agent: c.req.query("agent"),
    runner: c.req.query("runner"),
    provider: c.req.query("provider"),
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const configs: LocalConfig[] = [];
  const directories: DirectoryInfo[] = [];

  for (const dir of STANDALONE_CONFIG_DIRS) {
    const resolvedPath = resolve(dir);
    const exists = await fileExists(resolvedPath);
    let configCount = 0;

    if (exists) {
      try {
        const entries = await readdir(resolvedPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

          const configPath = join(resolvedPath, entry.name);
          const name = entry.name.replace(/\.json$/, "");

          try {
            const config = (await readJsonFile(configPath)) as Record<
              string,
              unknown
            >;
            if (hasFilters && !configMatchesFilters(config, filters)) continue;

            const rp = getRunnerParams(config);
            configCount++;

            configs.push({
              id: `config/${entry.name}`,
              path: configPath,
              directory: resolvedPath,
              name,
              config,
              hasTestCases:
                Array.isArray(config.testCases) && config.testCases.length > 0,
              hasSystemPrompt: rp.systemPrompt != null,
              hasJudgePrompt: rp.llmJudgeSystemPrompt != null,
            });
          } catch (err) {
            console.error(`[Local Configs] Failed to read ${configPath}:`, err);
          }
        }
      } catch {
        // Directory can't be read
      }
    }

    directories.push({ path: resolvedPath, exists, configCount });
  }

  return c.json({ directories, configs });
});

localConfigsRouter.get("/:name", async (c) => {
  const name = c.req.param("name");

  for (const dir of STANDALONE_CONFIG_DIRS) {
    const resolvedPath = resolve(dir);
    if (!(await fileExists(resolvedPath))) continue;

    const configPath = join(resolvedPath, `${name}.json`);
    if (!(await fileExists(configPath))) continue;

    const config = (await readJsonFile(configPath)) as Record<string, unknown>;

    return c.json({
      name,
      path: configPath,
      directory: resolvedPath,
      config,
    });
  }

  return c.json({ error: "Config not found" }, 404);
});

localConfigsRouter.post("/:name/import", async (c) => {
  const name = c.req.param("name");
  let body: { customName?: string } = {};
  try {
    body = await c.req.json<{ customName?: string }>();
  } catch {
    body = {};
  }

  for (const dir of STANDALONE_CONFIG_DIRS) {
    const resolvedPath = resolve(dir);
    if (!(await fileExists(resolvedPath))) continue;

    const configPath = join(resolvedPath, `${name}.json`);
    if (!(await fileExists(configPath))) continue;

    const config = (await readJsonFile(configPath)) as Record<string, unknown>;

    const validation = validateRunConfig(config, getRegistries());
    if (!validation.valid) {
      return c.json(
        { error: "Config validation failed", errors: validation.errors },
        400
      );
    }

    const configJson: Record<string, unknown> = {
      ...config,
      _importedFrom: configPath,
      _importedAt: new Date().toISOString(),
    };

    const configTags = Array.isArray(config.tags)
      ? config.tags.filter((t): t is string => typeof t === "string")
      : [];

    const savedConfig = await createConfig({
      name: body.customName || `${name} (imported)`,
      description:
        typeof config.description === "string"
          ? config.description
          : `Imported from: ${configPath}`,
      configJson,
      tags: ["imported", "local", ...configTags],
      createdBy: "local-import",
    });

    try {
      await ensureAgentsFromConfig({ configJson, importedFrom: configPath });
    } catch (error) {
      console.warn(
        `[Local Configs] Failed to sync agents from imported config "${name}":`,
        error
      );
    }

    return c.json(
      { message: "Config imported successfully", config: savedConfig },
      201
    );
  }

  return c.json({ error: "Config not found" }, 404);
});

interface LocalConfig {
  id: string;
  path: string;
  directory: string;
  name: string;
  config: Record<string, unknown>;
  hasTestCases: boolean;
  hasSystemPrompt: boolean;
  hasJudgePrompt: boolean;
}

interface DirectoryInfo {
  path: string;
  exists: boolean;
  configCount: number;
}
