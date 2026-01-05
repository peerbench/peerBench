import { IdSchema } from "../id";
import { z } from "zod";

export const BaseSystemPromptSchemaV1 = z.object({
  id: IdSchema,
  kind: z.string(),
  schemaVersion: z.number(),
  version: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type BaseSystemPromptV1 = z.infer<typeof BaseSystemPromptSchemaV1>;

export function createSystemPromptSchemaFactory<
  TBaseSchema extends typeof BaseSystemPromptSchemaV1,
  TBaseFields extends z.ZodRawShape = {},
>(factoryConfig: { baseSchema: TBaseSchema; fields?: TBaseFields }) {
  return function <
    TKind extends string,
    TSchemaVersion extends number,
    TBaseSchema extends typeof BaseSystemPromptSchemaV1 =
      typeof BaseSystemPromptSchemaV1,
    TFields extends z.ZodRawShape = {},
  >(config: {
    kind: TKind;
    schemaVersion: TSchemaVersion;
    fields?: TFields;
    baseSchema?: TBaseSchema;
  }) {
    const schema = (config.baseSchema ?? factoryConfig.baseSchema)
      .omit({ kind: true, schemaVersion: true })
      .extend({
        ...((config.fields ?? {}) as TFields),
        ...((factoryConfig.fields ?? {}) as TBaseFields),
        kind: z.literal(config.kind),
        schemaVersion: z.literal(config.schemaVersion),
      });
    return Object.assign(schema, {
      new(input: Omit<z.infer<typeof schema>, "kind" | "schemaVersion">) {
        return schema.parse({
          ...input,
          kind: config.kind,
          schemaVersion: config.schemaVersion,
        });
      },
    });
  };
}

/**
 * Defines a new system prompt schema which extends the base one.
 */
export function defineSystemPromptSchemaV1<
  TKind extends string,
  TFields extends z.ZodRawShape,
  TSchemaVersion extends number,
  TBaseSchema extends typeof BaseSystemPromptSchemaV1,
>(config: {
  kind: TKind;
  schemaVersion: TSchemaVersion;
  fields: TFields;
  baseSchema?: TBaseSchema;
}) {
  const schema = (config.baseSchema ?? BaseSystemPromptSchemaV1)
    .omit({
      kind: true,
      schemaVersion: true,
    })
    .extend({
      ...config.fields,
      kind: z.literal(config.kind),
      schemaVersion: z.literal(config.schemaVersion),
    });

  return Object.assign(schema, {
    new(input: Omit<z.infer<typeof schema>, "kind" | "schemaVersion">) {
      return schema.parse({
        ...input,
        kind: config.kind,
        schemaVersion: config.schemaVersion,
      });
    },
  });
}
