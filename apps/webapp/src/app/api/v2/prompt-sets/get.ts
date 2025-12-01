import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import {
  GetPromptSetsReturnItem,
  PromptSetService,
} from "@/services/promptset.service";
import { PaginatedResponse } from "@/types/db";
import { PromptSetOrderings, PromptSetAccessReasons } from "@/types/prompt-set";
import { Override } from "@/utils/type-helper";
import { EnumSchema } from "peerbench";
import { NextResponse } from "next/server";
import { z } from "zod";
import { promptSetFiltersSchema } from "@/validation/prompt-set-filters";
import { orderBySchema } from "@/validation/api/orderby";

const querySchema = promptSetFiltersSchema.extend({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  orderBy: orderBySchema(PromptSetOrderings).optional(),
  accessReason: EnumSchema(PromptSetAccessReasons).optional(),
  // ---------- search and sort filters ----------
  search: z.string().optional(),
  avgMin: z.coerce.number().optional(),
  avgMax: z.coerce.number().optional(),
  promptsMin: z.coerce.number().optional(),
  promptsMax: z.coerce.number().optional(),

  sortBy: z
    .enum([
      "createdAt-asc",
      "createdAt-desc",
      "updatedAt-asc",
      "updatedAt-desc",
    ])
    .optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const parsed = safeParseQueryParams(req, querySchema);

    const { page, pageSize, accessReason, ...filters } = parsed;

    const promptSets = await PromptSetService.getPromptSets({
      page,
      pageSize,
      filters: {
        ownerId: filters.ownerId,
        id: filters.id,
        title: filters.title,

        // new ones
        search: filters.search?.trim(),
        avgMin: filters.avgMin,
        avgMax: filters.avgMax,
        promptsMin: filters.promptsMin,
        promptsMax: filters.promptsMax,
        sortBy: filters.sortBy,
      },

      accessReason,
      requestedByUserId: ctx.userId ?? NULL_UUID,
    });

    return NextResponse.json(paginatedResponse(promptSets, page, pageSize));
  });

export type ResponseType = PaginatedResponse<
  Override<
    GetPromptSetsReturnItem,
    {
      createdAt: string;
      updatedAt: string;
    }
  >
>;
export type RequestQueryParams = z.input<typeof querySchema>;
