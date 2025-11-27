import { z } from "zod";
import { EnumSchema } from "peerbench";
import {
  PromptSetAccessReasons,
  PromptSetVisibilities,
} from "@/types/prompt-set";
import { alwaysArray } from "./always-array";

export const promptSetFiltersSchema = z.object({
  id: z.coerce.number().optional(),
  ownerId: z.string().uuid("Invalid owner ID").optional(),
  title: z.string().optional(),
  search: z.string().optional(),
  visibility: EnumSchema(PromptSetVisibilities).optional(),
  accessReason: EnumSchema(PromptSetAccessReasons).optional(),
  categories: alwaysArray(z.string()).optional(),
  tags: alwaysArray(z.string()).optional(),
});
