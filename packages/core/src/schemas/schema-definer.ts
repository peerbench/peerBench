import { z } from "zod";
import type { IdGenerator } from "../types/common";

/**
 * Creates a typed schema definer function for a given base schema and kind suffix.
 * Used to define versioned schemas (test cases, responses, scores, system prompts).
 */
export function buildSchemaDefiner<
  TBase extends z.ZodObject<any>,
>(baseSchema: TBase, kindSuffix: string) {
  return function defineSchema<TFields extends z.ZodRawShape = {}>(config: {
    baseSchema: z.ZodObject<any>;
    namespace?: string;
    kind?: string;
    schemaVersion?: number;
    fields?: TFields;
  }) {
    const fullKind = config.kind ? `${config.kind}.${kindSuffix}` : undefined;

    const overrides: Record<string, z.ZodType> = {};
    if (config.namespace !== undefined)
      overrides["namespace"] = z.literal(config.namespace);
    if (fullKind !== undefined)
      overrides["kind"] = z.literal(fullKind);
    if (config.schemaVersion !== undefined)
      overrides["schemaVersion"] = z.literal(config.schemaVersion);

    const schema = config.baseSchema.extend({
      ...(config.fields ?? {}),
      ...overrides,
    });

    const defaults: Record<string, unknown> = {};
    if (fullKind !== undefined) defaults["kind"] = fullKind;
    if (config.namespace !== undefined)
      defaults["namespace"] = config.namespace;
    if (config.schemaVersion !== undefined)
      defaults["schemaVersion"] = config.schemaVersion;

    return Object.assign(schema, {
      new(
        input: Omit<
          z.infer<typeof schema>,
          "kind" | "schemaVersion" | "namespace"
        >,
      ) {
        return schema.parse({ ...input, ...defaults }) as z.infer<
          typeof schema
        >;
      },
      async newWithId(
        input: Omit<
          z.infer<typeof schema>,
          "kind" | "schemaVersion" | "id" | "namespace"
        >,
        generator: IdGenerator,
      ) {
        const obj = schema.parse({
          ...input,
          id: "",
          ...defaults,
        }) as z.infer<typeof schema>;
        const id = await generator(obj);
        return { ...obj, id } as z.infer<typeof schema>;
      },
    });
  };
}
