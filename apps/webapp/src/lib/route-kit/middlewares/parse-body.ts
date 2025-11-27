import { NextRequest } from "next/server";
import { z, ZodSchema, ZodTypeDef } from "zod";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { RouteContext } from "..";

/**
 * Middleware to parse the request body using the given Zod schema.
 */
export function parseBody<Input, Output, Def extends ZodTypeDef = ZodTypeDef>(
  schema: ZodSchema<Output, Def, Input>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    const body = await req
      .clone() // Keep the original request body for re-using
      .json()
      .catch(() => ({}));
    return {
      body: {
        // In case if conflicts with an existing field, just extend it.
        ...(ctx?.body || {}),
        ...checkValidation(schema.safeParse(body)),
      } as z.infer<typeof schema>,
    };
  };
}
