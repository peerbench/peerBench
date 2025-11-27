import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { FilterService, PromptTagFilter } from "@/services/filter.service";
import { PaginatedResponse } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  tag: z.string().optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);
    const result = await FilterService.getPromptTags({
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        tag: query.tag,
      },
      requestedByUserId: ctx.userId ?? NULL_UUID,
    });

    return NextResponse.json(
      paginatedResponse(result, query.page, query.pageSize)
    );
  });

export type ResponseType = PaginatedResponse<PromptTagFilter>;
export type RequestQueryParams = z.input<typeof querySchema>;
