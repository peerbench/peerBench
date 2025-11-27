import { z } from "zod";

/*
 * Validates the string as a JSON value
 */
export function JSONSchema<T>(message = "Invalid JSON") {
  return z.string().transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value);
      return parsed as T;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
      });

      return z.NEVER;
    }
  });
}
