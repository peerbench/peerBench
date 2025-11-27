import { z } from "zod";

/**
 * A Zod schema that transforms string value ("true" or "false") to
 * a boolean one if it is not undefined or null. Also accepts boolean
 * values (then uses `z.boolean()`).
 */
export function StringBool() {
  return z.union([
    z.boolean(),
    z.string().transform((value) => {
      if (value === undefined || value === null) {
        return value;
      }

      return value.toLowerCase() === "true";
    }),
  ]);
}
