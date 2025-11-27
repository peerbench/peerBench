import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import {
  CommentService,
  GetResponseCommentsReturnItem,
} from "@/services/comment.service";
import { PaginatedResponse } from "@/types/db";
import { Override } from "@/utils/type-helper";
import { NextResponse } from "next/server";
import { z } from "zod";

export const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const GET = createHandler()
  .use(smoothAuth)
  .use(pathParams<{ responseId: string }>())
  .handle(async (req, ctx) => {
    const { page, pageSize } = safeParseQueryParams(req, querySchema);
    const result = await CommentService.getResponseComments({
      requestedByUserId: ctx.userId ?? NULL_UUID,
      page,
      pageSize,
      filters: {
        responseId: ctx.responseId,
      },
    });

    return NextResponse.json(paginatedResponse(result, page, pageSize));
  });

export type ResponseType = Override<
  PaginatedResponse<GetResponseCommentsReturnItem>,
  {
    createdAt: string;
    updatedAt: string;
  }
>;
export type RequestQueryParams = z.input<typeof querySchema>;
