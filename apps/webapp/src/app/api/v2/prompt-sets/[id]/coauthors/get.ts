import { NULL_UUID } from "@/lib/constants";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import {
  GetCoAuthorsReturnItem,
  PromptSetService,
} from "@/services/promptset.service";
import { PaginatedResponse } from "@/types/db";
import { Override } from "@/utils/type-helper";
import { StringBool } from "@/validation/string-bool";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  excludePublicCollaborators: StringBool().default("false").optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .use(pathParams<{ id: string }>())
  .handle(async (request: NextRequest, ctx) => {
    const query = safeParseQueryParams(request, querySchema);
    const id = checkValidation(
      z.coerce.number({ message: "Invalid ID" }).safeParse(ctx.id)
    );

    const coauthors = await PromptSetService.getCollaborators({
      promptSetId: id,
      requestedByUserId: ctx.userId ?? NULL_UUID,
      page: query.page,
      pageSize: query.pageSize,
      excludePublicCollaborators: query.excludePublicCollaborators,
    });

    return NextResponse.json(
      paginatedResponse(coauthors, query.page, query.pageSize)
    );
  });

export type ResponseType = PaginatedResponse<
  Override<
    GetCoAuthorsReturnItem,
    {
      joinedAt: string | null;
    }
  >
>;
export type RequestQueryParams = z.input<typeof querySchema>;
