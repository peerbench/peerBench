import { PromptStatuses } from "@/database/types";
import { EnumSchema, PromptTypes } from "peerbench";
import { PromptAccessReasons } from "@/types/prompt";
import { z } from "zod";
import { StringBool } from "../string-bool";
import { alwaysArray } from "../always-array";

export const promptFiltersSchema = z.object({
  id: alwaysArray(z.string().uuid("Invalid Prompt ID")).optional(),
  accessReason: EnumSchema(PromptAccessReasons).optional(),
  promptSetId: alwaysArray(z.coerce.number()).optional(),
  search: z.string().optional(),
  searchId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uploaderId: z.string().uuid("Invalid uploader ID").optional(),
  status: alwaysArray(
    z.enum([PromptStatuses.included, PromptStatuses.excluded])
  ).optional(),
  excludeReviewedByUserId: z
    .string()
    .uuid("Invalid excluded reviewed by user ID")
    .optional(),
  reviewedByUserId: z.string().uuid("Invalid reviewed by user ID").optional(),
  minAvgScore: z.coerce.number().optional(),
  maxAvgScore: z.coerce.number().optional(),
  minScoreCount: z.coerce.number().optional(),
  maxScoreCount: z.coerce.number().optional(),
  minBadScoreCount: z.coerce.number().optional(),
  maxBadScoreCount: z.coerce.number().optional(),
  badScoreThreshold: z.coerce.number().optional(),
  minGoodScoreCount: z.coerce.number().optional(),
  maxGoodScoreCount: z.coerce.number().optional(),
  goodScoreThreshold: z.coerce.number().optional(),
  minReviewsCount: z.coerce.number().optional(),
  maxReviewsCount: z.coerce.number().optional(),
  minPositiveReviewsCount: z.coerce.number().optional(),
  maxPositiveReviewsCount: z.coerce.number().optional(),
  minNegativeReviewsCount: z.coerce.number().optional(),
  maxNegativeReviewsCount: z.coerce.number().optional(),
  maxPromptAgeDays: z.coerce.number().optional(),
  type: alwaysArray(z.nativeEnum(PromptTypes)).optional(),
  modelSlugs: z.string().optional(),
  maxGapToFirstResponse: z.coerce.number().optional(),
  isRevealed: StringBool().optional(),
  notScoredByModelSlug: alwaysArray(z.string()).optional(),
});
