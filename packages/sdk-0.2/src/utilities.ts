import type { z } from "zod";

export type ClassConstructor<T> = new (...args: any[]) => T;
export type AbstractClassConstructor<T> = abstract new (...args: any[]) => T;

export type InferExtension<
  TExtension extends z.ZodRawShape,
  TBase = unknown,
> = z.infer<z.ZodObject<TExtension>> & TBase;

type WidenLiteralSchema<S> = S extends z.ZodString
  ? z.ZodString | z.ZodLiteral<string>
  : S extends z.ZodNumber
    ? z.ZodNumber | z.ZodLiteral<number>
    : S extends z.ZodBoolean
      ? z.ZodBoolean | z.ZodLiteral<boolean>
      : S extends z.ZodLiteral<infer L>
        ? L extends string
          ? z.ZodString | z.ZodLiteral<L>
          : L extends number
            ? z.ZodNumber | z.ZodLiteral<L>
            : L extends boolean
              ? z.ZodBoolean | z.ZodLiteral<L>
              : S
        : S extends z.ZodOptional<infer O>
          ? z.ZodOptional<WidenLiteralSchema<O>>
          : S extends z.ZodType
            ? S
            : never;

export type WidenZodObject<T extends z.ZodObject> = z.ZodObject<{
  [K in keyof T["shape"]]: WidenLiteralSchema<T["shape"][K]>;
}>;
