import { z } from "zod";
import { resolveEnvVariables } from "@/utils/resolve-env-variables";
import { RunConfigSchema } from "./unified-run-config";
import type { Registry } from "@/registry/create-registry";
import type { RunnerEntry } from "@/registry/runner";
import type { ScorerEntry } from "@/registry/scorer";
import type { StorageEntry } from "@/registry/storage";
import type { ProviderEntry } from "@/registry/provider";

interface RegistryLike {
  has(name: string): boolean;
  find(name: string): { configSchema?: z.ZodType; [key: string]: unknown };
  list(): string[];
}

interface Registries {
  runners: RegistryLike;
  scorers: RegistryLike;
  storages: RegistryLike;
  providers: RegistryLike;
  aliases?: Record<string, string>;
}

function resolveAliases(
  value: unknown,
  allAliases: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return allAliases[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveAliases(v, allAliases));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveAliases(v, allAliases)]),
    );
  }
  return value;
}

function validateRunConfig(
  rawConfig: Record<string, unknown>,
  registries: Registries,
): ValidationResult {
  const errors: ValidationError[] = [];

  let resolved: Record<string, unknown>;
  try {
    resolved = resolveEnvVariables(rawConfig);
  } catch (err) {
    return {
      valid: false as const,
      errors: [
        {
          path: "",
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }

  const allAliases = registries.aliases ?? {};
  resolved = resolveAliases(resolved, allAliases) as Record<string, unknown>;

  const parsed = RunConfigSchema.safeParse(resolved);
  if (!parsed.success) {
    return {
      valid: false as const,
      errors: [
        {
          path: "",
          message: z.prettifyError(parsed.error),
        },
      ],
    };
  }

  const config = parsed.data;

  if (!registries.runners.has(config.runner)) {
    errors.push({
      path: "runner",
      message: `Unknown runner: "${config.runner}". Available: ${registries.runners.list().join(", ")}`,
    });
  } else {
    const runnerEntry = registries.runners.find(config.runner);
    if (runnerEntry.configSchema) {
      const runnerResult = runnerEntry.configSchema.safeParse(
        config.runnerParams ?? {},
      );
      if (!runnerResult.success) {
        errors.push(...collectFlatErrors(runnerResult.error, "runnerParams"));
      }
    }
  }

  if (config.scorer) {
    if (!registries.scorers.has(config.scorer.type)) {
      errors.push({
        path: "scorer.type",
        message: `Unknown scorer: "${config.scorer.type}". Available: ${registries.scorers.list().join(", ")}`,
      });
    } else {
      const scorerEntry = registries.scorers.find(config.scorer.type);
      if (scorerEntry.configSchema) {
        const scorerResult = scorerEntry.configSchema.safeParse(
          config.scorer.params ?? {},
        );
        if (!scorerResult.success) {
          errors.push(
            ...collectFlatErrors(scorerResult.error, "scorer.params"),
          );
        }
      }
    }
  }

  for (const [i, tc] of config.testCases.entries()) {
    if (!registries.storages.has(tc.storage)) {
      errors.push({
        path: `testCases[${i}].storage`,
        message: `Unknown storage: "${tc.storage}". Available: ${registries.storages.list().join(", ")}`,
      });
    } else {
      const storageEntry = registries.storages.find(tc.storage);
      if (storageEntry.configSchema) {
        const storageResult = storageEntry.configSchema.safeParse(
          tc.params ?? {},
        );
        if (!storageResult.success) {
          errors.push(
            ...collectFlatErrors(storageResult.error, `testCases[${i}].params`),
          );
        }
      }
    }
  }

  for (const [i, target] of config.targets.entries()) {
    if (!registries.providers.has(target.provider)) {
      errors.push({
        path: `targets[${i}].provider`,
        message: `Unknown provider: "${target.provider}". Available: ${registries.providers.list().join(", ")}`,
      });
    } else {
      const providerEntry = registries.providers.find(target.provider);
      if (providerEntry.configSchema) {
        const providerResult = providerEntry.configSchema.safeParse(
          target.params ?? {},
        );
        if (!providerResult.success) {
          errors.push(
            ...collectFlatErrors(
              providerResult.error,
              `targets[${i}].params`,
            ),
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false as const, errors };
  }

  return { valid: true as const };
}

function collectFlatErrors(
  error: z.ZodError,
  prefix: string,
): ValidationError[] {
  const flat = z.flattenError(error);
  const result: ValidationError[] = [];

  for (const msg of flat.formErrors) {
    result.push({ path: prefix, message: msg });
  }

  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (!Array.isArray(messages)) continue;
    for (const msg of messages) {
      result.push({
        path: prefix ? `${prefix}.${field}` : field,
        message: String(msg),
      });
    }
  }

  return result;
}

interface ValidationError {
  path: string;
  message: string;
}

type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ValidationError[] };

export {
  validateRunConfig,
  type ValidationResult,
  type ValidationError,
  type Registries,
};
