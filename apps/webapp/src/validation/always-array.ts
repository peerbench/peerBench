import { z, ZodSchema } from "zod";

export function alwaysArray<T extends ZodSchema>(schema: T) {
  return z
    .union([z.array(schema), schema])
    .transform<
      z.infer<typeof schema>[]
    >((val) => (!Array.isArray(val) ? [val] : val));
}
