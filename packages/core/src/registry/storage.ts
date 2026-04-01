import type { z } from "zod";
import type { AbstractStorage } from "../types/storage";

function defineStorageEntry<
  TStorage extends AbstractStorage<any>,
  TConfigSchema extends z.ZodType,
>(entry: {
  description: string;
  longDescription?: string;
  configSchema?: TConfigSchema;
  instantiateFromConfig: (
    config: Record<string, unknown>,
    configSchema: TConfigSchema | undefined,
  ) => TStorage;
}): StorageEntry<TStorage> {
  return {
    ...entry,
    instantiateFromConfig: (config) =>
      entry.instantiateFromConfig(
        { ...(config ?? {}), params: config?.params ?? {} },
        entry.configSchema,
      ),
  };
}

interface StorageEntry<
  TStorage extends AbstractStorage<any> = AbstractStorage<any>,
> {
  description: string;
  longDescription?: string;
  configSchema?: z.ZodType;
  instantiateFromConfig: (config?: Record<string, unknown>) => TStorage;
}

export { defineStorageEntry, type StorageEntry };
