import { z } from "zod";
import { removeDIDPrefix } from "../utils";

/**
 * Parses the string and removes the `did:<entity type>:` prefix from it
 * then applies the given schema to the rest of the string
 */
export function DIDSchema<Input, Output>(
  schema: z.ZodSchema<Input, z.ZodTypeDef, Output>
) {
  return (
    z
      .string()
      // TODO: Maybe in the future we can force "did:<entity type>:" prefix
      // .startsWith("did:....")
      .transform((val) => removeDIDPrefix(val))
      .pipe(schema)
  );
}

export const DIDasUUIDSchema = DIDSchema(
  z.string().uuid({ message: "Invalid DID" })
);
