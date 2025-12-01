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
import { PromptSetAccessReasons, PromptSetOrderings } from "@/types/prompt-set";
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
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const { page, pageSize, orderBy, ...filters } = safeParseQueryParams(
      req,
      querySchema
    );

    const promptSets = await PromptSetService.getPromptSets({
      page,
      pageSize,
      filters,
      orderBy: orderBy ? { [orderBy.key]: orderBy.direction } : undefined,

      // Apply access control rules by using an empty UUID if the user is not authenticated
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
