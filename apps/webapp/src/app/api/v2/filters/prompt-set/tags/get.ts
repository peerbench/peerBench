import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { ClientSideResponseType, NextResponseType } from "@/lib/utilities";
import { FilterService } from "@/services/filter.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(5000).optional().default(100),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);
    const tags = await FilterService.getPromptSetTags({
      page: query.page,
      pageSize: query.pageSize,
      requestedByUserId: ctx.userId ?? NULL_UUID,
    });

    return NextResponse.json(
      paginatedResponse(tags, query.page, query.pageSize)
    );
  });

export type ResponseType = ClientSideResponseType<NextResponseType<typeof GET>>;
export type RequestQueryParams = z.input<typeof querySchema>;
