import { Prisma, type Config } from "@prisma/client";
import { findConfigByHash } from "./find-config-by-hash";
import { createConfig } from "./create-config";

export async function findOrCreateConfig(
  params: FindOrCreateConfigParams
): Promise<{ config: Config; created: boolean }> {
  const existing = await findConfigByHash({
    configJson: params.configJson,
    tx: params.tx,
  });
  if (existing) {
    return { config: existing, created: false };
  }

  const configData = params.configJson as {
    runner?: string;
    targets?: Array<{ name?: string; model?: string }>;
    description?: string;
  };

  const parts: string[] = [];
  if (configData.runner) {
    parts.push(configData.runner.replace(/-/g, " "));
  }
  if (configData.targets && configData.targets.length > 0) {
    const firstTarget = configData.targets[0];
    parts.push(firstTarget.name || firstTarget.model || "target");
  }

  const baseName = parts.length > 0 ? parts.join(" - ") : "Auto-saved config";
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const name = `${baseName} (${timestamp})`;

  const config = await createConfig({
    name,
    description: configData.description,
    configJson: params.configJson,
    createdBy: "auto",
    tx: params.tx,
  });

  console.log(`[DB] Auto-created config "${name}" with id ${config.id}`);
  return { config, created: true };
}

export type FindOrCreateConfigParams = {
  configJson: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};
