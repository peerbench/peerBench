import z from "zod";

export function buildSchemaDefiner<
  TBaseShape extends {
    kind: z.ZodType;
    schemaVersion: z.ZodType;
    [key: string]: z.ZodType;
  },
>() {
  return function <
    TBaseSchema extends z.ZodObject<
      Omit<TBaseShape, "kind" | "schemaVersion"> & {
        kind: z.ZodString | z.ZodLiteral<string>;
        schemaVersion: z.ZodNumber | z.ZodLiteral<number>;
      }
    >,
    TKind extends string | undefined = undefined,
    TSchemaVersion extends number | undefined = undefined,
    TFields extends z.ZodRawShape = {},
  >(config: {
    baseSchema: TBaseSchema;
    kind?: TKind;
    schemaVersion?: TSchemaVersion;
    fields?: TFields;
  }) {
    const schema = config.baseSchema
      .omit({ kind: true, schemaVersion: true })
      .extend({
        ...((config.fields ?? {}) as TFields),
        kind: (config.kind !== undefined
          ? z.literal(config.kind)
          : config.baseSchema.shape.kind) as TKind extends undefined
          ? TBaseSchema["shape"]["kind"]
          : z.ZodLiteral<TKind>,
        schemaVersion: (config.schemaVersion !== undefined
          ? z.literal(config.schemaVersion)
          : config.baseSchema.shape
              .schemaVersion) as TSchemaVersion extends undefined
          ? TBaseSchema["shape"]["schemaVersion"]
          : z.ZodLiteral<TSchemaVersion>,
      });

    type SchemaType =
      TBaseSchema extends z.ZodObject<infer U>
        ? z.ZodObject<
            Omit<U, "kind" | "schemaVersion"> &
              TFields & {
                kind: TKind extends undefined ? U["kind"] : z.ZodLiteral<TKind>;
                schemaVersion: TSchemaVersion extends undefined
                  ? U["schemaVersion"]
                  : z.ZodLiteral<TSchemaVersion>;
              }
          >
        : never;

    return Object.assign(schema, {
      new(input: Omit<z.infer<typeof schema>, "kind" | "schemaVersion">) {
        return schema.parse({
          ...input,
          kind: config.kind,
          schemaVersion: config.schemaVersion,
        });
      },
    }) as unknown as SchemaType & {
      /**
       * Creates a new object with the given input. Uses the `kind` and
       * `schemaVersion` from the schema config. Although the `input` is already typed,
       * it still uses `.parse()` to validate it.
       * @param input
       * @returns The object that follows the schema
       */
      new: (
        input: Omit<z.infer<SchemaType>, "kind" | "schemaVersion">
      ) => z.infer<SchemaType>;
    };
  };
}
