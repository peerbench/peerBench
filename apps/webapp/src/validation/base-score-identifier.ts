import { z } from "zod";

/**
 * Schema that represents the primary identifiers of a single Prompt Score
 */
export const baseScoreIdentifierSchema = z.object({
  id: z.string(),
  hashSha256Registration: z.string(),
  hashCIDRegistration: z.string(),
});
