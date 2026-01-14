import { IdGenerator } from "@/types";
import { WidenZodObject } from "@/utilities";
import z from "zod";

export function buildSchemaDefiner<
  TBaseShape extends {
    kind: z.ZodString | z.ZodLiteral<string>;
    namespace: z.ZodString | z.ZodLiteral<string>;
    schemaVersion: z.ZodNumber | z.ZodLiteral<number>;
  },
  TKindSuffix extends string = "",
>(_schema: z.ZodObject<TBaseShape>, kindSuffix: TKindSuffix) {
  return function <
    TBaseSchema extends WidenZodObject<z.ZodObject<TBaseShape>>,
    TNamespace extends string | undefined = undefined,
    TKind extends string | undefined = undefined,
    TSchemaVersion extends number | undefined = undefined,
    TFields extends z.ZodRawShape = {},
  >(config: {
    baseSchema: TBaseSchema;
    namespace?: TNamespace;
    kind?: TKind;
    schemaVersion?: TSchemaVersion;
    fields?: TFields;
  }) {
    const kind = `${config.kind}.${kindSuffix}` as const;
    const schema = config.baseSchema.extend({
      ...((config.fields ?? {}) as TFields),
      namespace: (config.namespace !== undefined
        ? z.literal(config.namespace)
        : config.baseSchema.shape.namespace) as TNamespace extends undefined
        ? TBaseSchema["shape"]["namespace"]
        : z.ZodLiteral<TNamespace>,
      kind: (config.kind !== undefined
        ? z.literal(kind)
        : config.baseSchema.shape.kind) as TKind extends undefined
        ? TBaseSchema["shape"]["kind"]
        : z.ZodLiteral<`${TKind}.${TKindSuffix}`>,
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
            Omit<U, "kind" | "schemaVersion" | "namespace"> &
              TFields & {
                namespace: TNamespace extends undefined
                  ? U["namespace"]
                  : z.ZodLiteral<TNamespace>;
                kind: TKind extends undefined
                  ? U["kind"]
                  : z.ZodLiteral<`${TKind}.${TKindSuffix}`>;
                schemaVersion: TSchemaVersion extends undefined
                  ? U["schemaVersion"]
                  : z.ZodLiteral<TSchemaVersion>;
              }
          >
        : never;

    return Object.assign(schema, {
      new(
        input: Omit<
          z.infer<typeof schema>,
          "kind" | "schemaVersion" | "namespace"
        >
      ) {
        return schema.parse({
          ...input,
          kind,
          namespace: config.namespace,
          schemaVersion: config.schemaVersion,
        });
      },
      async newWithId(
        input: Omit<
          z.infer<typeof schema>,
          "kind" | "schemaVersion" | "id" | "namespace"
        >,
        generator: IdGenerator
      ) {
        const obj = schema.parse({
          ...input,
          id: "",
          kind,
          namespace: config.namespace,
          schemaVersion: config.schemaVersion,
        });
        const id = await generator(obj);

        return {
          ...obj,
          id,
        };
      },
    }) as unknown as SchemaType & {
      new: (
        input: Omit<z.infer<SchemaType>, "kind" | "schemaVersion" | "namespace">
      ) => z.infer<SchemaType>;

      newWithId(
        input: Omit<
          z.infer<SchemaType>,
          "id" | "kind" | "schemaVersion" | "namespace"
        >,
        generator: IdGenerator
      ): Promise<z.infer<SchemaType>>;
    };
  };
}
