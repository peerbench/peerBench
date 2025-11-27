import { z } from "zod";

/**
 * Parses the given string as an enum value based on either
 * the keys or values of the given enum.
 * @param lookFor - Whether to look for the key or value
 */
export function EnumSchema<T>(
  _enum: Record<string, T>,
  lookFor: "key" | "value" = "value"
) {
  return z.string().transform((value, ctx) => {
    let enumValue: T | undefined;

    if (lookFor === "key") {
      enumValue = _enum[value as keyof typeof _enum];
    } else {
      const values = Object.values(_enum);
      enumValue = values.find((v) => v === value);
    }

    if (!enumValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid enum value: ${value}`,
      });
      return z.NEVER;
    }

    return enumValue;
  });
}
