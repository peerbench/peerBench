import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { FilterService, PromptSetFilter } from "@/services/filter.service";
import { PaginatedResponse } from "@/types/db";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { EnumSchema } from "peerbench";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  accessReason: EnumSchema(PromptSetAccessReasons).optional(),
  title: z.string().optional(),
  id: z.coerce.number().optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);
    const result = await FilterService.getPromptSets({
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        title: query.title,
        id: query.id,
      },
      accessReason: query.accessReason,
      requestedByUserId: ctx.userId ?? NULL_UUID,
    });

    return NextResponse.json(
      paginatedResponse(result, query.page, query.pageSize)
    );
  });

export type ResponseType = PaginatedResponse<PromptSetFilter>;
export type RequestQueryParams = z.input<typeof querySchema>;
