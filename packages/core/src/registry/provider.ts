import type { z } from "zod";
import type { CallableLLM } from "../types/provider";
import { injectDefaultAuthToken } from "@/utils/default-auth-tokens";

type Target = {
  name?: string;
  params?: Record<string, unknown>;
};

function defineProviderEntry<TConfigSchema extends z.ZodType>(entry: {
  description: string;
  longDescription?: string;
  configSchema?: TConfigSchema;
  instantiateFromConfig: (
    target: Target,
    configSchema: TConfigSchema | undefined,
  ) => CallableLLM;
  getEndpoint: (
    target: Target,
    configSchema: TConfigSchema | undefined,
  ) => string;
}): ProviderEntry {
  const normalizeTarget = (target: Target) => ({
    ...target,
    params: injectDefaultAuthToken(target.params ?? {}),
  });

  return {
    ...entry,
    instantiateFromConfig: (target) =>
      entry.instantiateFromConfig(normalizeTarget(target), entry.configSchema),
    getEndpoint: (target) =>
      entry.getEndpoint(normalizeTarget(target), entry.configSchema),
  };
}

interface ProviderEntry {
  description: string;
  longDescription?: string;
  configSchema?: z.ZodType;
  instantiateFromConfig: (target: Target) => CallableLLM;
  getEndpoint: (target: Target) => string;
}

export { defineProviderEntry, type ProviderEntry, type Target };
