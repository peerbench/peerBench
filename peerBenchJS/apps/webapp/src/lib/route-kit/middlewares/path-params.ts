import { NextRequest } from "next/server";
import { RouteContext } from "..";
import { z, ZodSchema, ZodTypeDef } from "zod";
import { checkValidation } from "@/lib/route-helpers/check-validation";

/**
 * Middleware to expand path params from `context.params` into the context
 * object itself. Uses the given type to infer new context fields.
 */
export function pathParams<T extends Record<string, string>>() {
  return async (req: NextRequest, ctx: RouteContext) => {
    return (await ctx.params) as T;
  };
}

/**
 * Middleware to expand path params from `context.params` into the context
 * object itself. Uses the given object as Zod object schema to safely
 * parse the path params.
 */
export function parsePathParams<
  Def extends ZodTypeDef,
  Output,
  Params extends Record<string, ZodSchema<Output, Def>>,
>(params: Params) {
  return async (req: NextRequest, ctx: RouteContext) => {
    return checkValidation(z.object(params).safeParse(await ctx.params));
  };
}
