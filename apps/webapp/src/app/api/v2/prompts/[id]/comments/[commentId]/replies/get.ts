import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { parsePathParams } from "@/lib/route-kit/middlewares/path-params";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import {
  CommentService,
  GetPromptCommentsReturnItem,
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
  .use(
    parsePathParams({
      id: z.string().uuid(),
      commentId: z.coerce.number().int().positive(),
    })
  )
  .handle(async (req, ctx) => {
    const { page, pageSize } = safeParseQueryParams(req, querySchema);
    const result = await CommentService.getPromptComments({
      requestedByUserId: ctx.userId ?? NULL_UUID,
      page,
      pageSize,
      filters: {
        promptId: ctx.id,
        parentCommentId: ctx.commentId,
      },
    });

    return NextResponse.json(paginatedResponse(result, page, pageSize));
  });

export type ResponseType = PaginatedResponse<
  Override<
    GetPromptCommentsReturnItem,
    {
      createdAt: string;
      updatedAt: string;
    }
  >
>;
export type RequestQueryParams = z.input<typeof querySchema>;
