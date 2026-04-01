import { z } from "zod";

function buildSchemaMap<
  T extends Record<
    string,
    {
      description: string;
      configSchema: z.ZodType;
      longDescription?: string;
    }
  >,
>(meta: T) {
  const result: Record<string, SchemaEntry> = {};
  for (const [name, entry] of Object.entries(meta)) {
    result[name] = {
      jsonSchema: z.toJSONSchema(entry.configSchema) as JSONSchema,
      description: entry.description,
      longDescription: (entry as { longDescription?: string }).longDescription,
    };
  }
  return result;
}

// Studio loads metadata from the API at runtime via /api/benchmark-meta.
// These are empty defaults — populated by initSchemas() after API fetch.
export let providerSchemas: Record<string, SchemaEntry> = {};
export let storageSchemas: Record<string, SchemaEntry> = {};
export let scorerSchemas: Record<string, SchemaEntry> = {};
export let runnerSchemas: Record<string, SchemaEntry> = {};

export let providerNames: string[] = [];
export let storageNames: string[] = [];
export let scorerNames: string[] = [];
export let runnerNames: string[] = [];

export let runnerCompatibility: Record<string, RunnerCompatibility> = {};

export function initSchemas(meta: {
  providers?: Record<string, { description: string; configSchema: z.ZodType; longDescription?: string }>;
  storages?: Record<string, { description: string; configSchema: z.ZodType; longDescription?: string }>;
  scorers?: Record<string, { description: string; configSchema: z.ZodType; longDescription?: string }>;
  runners?: Record<string, { description: string; configSchema: z.ZodType; longDescription?: string; supportedScorers?: readonly string[]; supportedStorages?: readonly string[] }>;
}) {
  if (meta.providers) {
    providerSchemas = buildSchemaMap(meta.providers);
    providerNames = Object.keys(meta.providers);
  }
  if (meta.storages) {
    storageSchemas = buildSchemaMap(meta.storages);
    storageNames = Object.keys(meta.storages);
  }
  if (meta.scorers) {
    scorerSchemas = buildSchemaMap(meta.scorers);
    scorerNames = Object.keys(meta.scorers);
  }
  if (meta.runners) {
    runnerSchemas = buildSchemaMap(meta.runners);
    runnerNames = Object.keys(meta.runners);
    runnerCompatibility = Object.fromEntries(
      Object.entries(meta.runners).map(([name, entry]) => [
        name,
        {
          supportedScorers: entry.supportedScorers ?? [],
          supportedStorages: entry.supportedStorages ?? [],
        },
      ]),
    );
  }
}

export { buildSchemaMap };

export interface SchemaEntry {
  jsonSchema: JSONSchema;
  description: string;
  longDescription?: string;
}

export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean | JSONSchema;
  [key: string]: unknown;
}

export interface RunnerCompatibility {
  supportedScorers: readonly string[];
  supportedStorages: readonly string[];
}
