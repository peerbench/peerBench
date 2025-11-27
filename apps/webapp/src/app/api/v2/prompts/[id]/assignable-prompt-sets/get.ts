import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import {
  GetAssignablePromptSetsReturnItem,
  PromptSetService,
} from "@/services/promptset.service";
import { PaginatedResponse } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  search: z.string().optional(),
});

export const GET = createHandler()
  .use(auth)
  .use(pathParams<{ id: string }>())
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);
    const results = await PromptSetService.getAssignablePromptSets({
      promptId: ctx.id,
      requestedByUserId: ctx.userId,
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        promptSetTitle: query.search,
      },
    });

    return NextResponse.json(
      paginatedResponse(results, query.page, query.pageSize)
    );
  });

export type ResponseType = PaginatedResponse<GetAssignablePromptSetsReturnItem>;
export type RequestQueryParams = z.input<typeof querySchema>;
