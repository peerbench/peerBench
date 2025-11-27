import { checkValidation } from "@/lib/route-helpers/check-validation";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { parseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import {
  GetInvitationsReturnItem,
  PromptSetService,
} from "@/services/promptset.service";
import { PaginatedResponse } from "@/types/db";
import { Override } from "@/utils/type-helper";
import { StringBool } from "@/validation/string-bool";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  excludeRevokedInvitations: StringBool().optional().default(false),
  excludeUsedInvitations: StringBool().optional().default(false),
});

export const GET = createHandler()
  .use(auth)
  .use(pathParams<{ id: string }>())
  .handle(async (req, ctx) => {
    const query = checkValidation(
      querySchema.safeParse(
        parseQueryParams(req, {
          page: false,
          pageSize: false,
          excludeRevokedInvitations: false,
          excludeUsedInvitations: false,
        })
      )
    );
    const id = checkValidation(
      z.coerce.number({ message: "Invalid ID" }).safeParse(ctx.id)
    );

    const invitations = await PromptSetService.getInvitations({
      promptSetId: id,
      requestedByUserId: ctx.userId,
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        excludeRevokedInvitations: query.excludeRevokedInvitations,
        excludeUsedInvitations: query.excludeUsedInvitations,
      },
    });

    return NextResponse.json(
      paginatedResponse(invitations, query.page, query.pageSize)
    );
  });

export type ResponseType = PaginatedResponse<
  Override<
    GetInvitationsReturnItem,
    {
      createdAt: string;
      usedAt: string | null;
      revokedAt: string | null;
    }
  >
>;
export type RequestQueryParams = z.input<typeof querySchema>;
