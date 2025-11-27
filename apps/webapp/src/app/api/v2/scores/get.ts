import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import {
  GetPromptScoresReturnItem,
  PromptScoreService,
} from "@/services/prompt-score.service";
import { PaginatedResponse } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  responseId: z.string().uuid("Invalid Response ID").optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const { page, pageSize, ...query } = safeParseQueryParams(req, querySchema);
    const result = await PromptScoreService.getPromptScores({
      requestedByUserId: ctx.userId ?? NULL_UUID,
      page,
      pageSize,
      filters: {
        ...query,
      },
    });

    return NextResponse.json(paginatedResponse(result, page, pageSize));
  });

export type ResponseType = PaginatedResponse<GetPromptScoresReturnItem>;
export type RequestQueryParams = z.input<typeof querySchema>;
