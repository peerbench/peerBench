import { NextRequest } from "next/server";
import { z } from "zod";
import { checkValidation } from "./check-validation";
import { isArrayInputSchema } from "@/utils/is-array-input-schema";

/**
 * Parses the query params from request into a plain object.
 * The params that are marked as `true` will be parsed as an
 * array and others will be string, or undefined if not presented.
 * @deprecated Use `safeParseQueryParams` instead.
 */
export function parseQueryParams<
  TParams extends Record<string, boolean>,
  TResult = {
    [K in keyof TParams]: TParams[K] extends true
      ? string[]
      : string | undefined;
  },
>(request: NextRequest, params: TParams): TResult {
  const finalObject: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === true) {
      finalObject[key] = request.nextUrl.searchParams.getAll(key);
    } else {
      finalObject[key] = request.nextUrl.searchParams.get(key) ?? undefined;
    }
  }

  return finalObject as TResult;
}

/**
 * Safely parses the query params based on the given schema.
 * If a field of the schema is defined to accept an array,
 * then that field will be parsed as an array from the query params.
 * That param from the query string should be duplicated for each element e.g:
 * `?tags=tag1&tags=tag2` will be parsed as `["tag1", "tag2"]`.
 */
export function safeParseQueryParams<T extends z.AnyZodObject>(
  request: NextRequest,
  schema: T
): z.infer<T> {
  const finalObject: Record<string, string | string[] | undefined> = {};

  // Get the shape of the schema to determine field types
  const shape = schema._def.shape();

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const zodField = fieldSchema as z.ZodTypeAny;

    if (isArrayInputSchema(zodField)) {
      finalObject[key] = request.nextUrl.searchParams.getAll(key);
    } else {
      finalObject[key] = request.nextUrl.searchParams.get(key) ?? undefined;
    }
  }

  return checkValidation(schema.safeParse(finalObject));
}
