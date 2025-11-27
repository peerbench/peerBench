import { EnumSchema } from "peerbench";
import { z } from "zod";

export function orderBySchema<T extends Record<string, string>>(
  columns: T,
  lookFor: "key" | "value" = "value"
) {
  return z.string().transform((val) => {
    const [key = null, direction = null] = val.split(":");

    if (key === null || direction === null) {
      return z.NEVER;
    }

    return {
      key: EnumSchema(columns, lookFor).parse(key) as T[keyof T],
      direction: z.enum(["asc", "desc"]).parse(direction),
    };
  });
}
