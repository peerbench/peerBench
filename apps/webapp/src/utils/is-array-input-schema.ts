import { z } from "zod";

/**
 * Checks whether the given schema accepts array inputs.
 */
export function isArrayInputSchema(schema: z.ZodTypeAny): boolean {
  // unwrap simple wrappers
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return isArrayInputSchema(schema._def.innerType);
  }

  // effects: input type stays the same for transform/refine
  if (schema instanceof z.ZodEffects) {
    return isArrayInputSchema(schema._def.schema);
  }

  return schema instanceof z.ZodArray || schema instanceof z.ZodTuple;
}
