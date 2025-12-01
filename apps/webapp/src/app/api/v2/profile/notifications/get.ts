import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { ProfileService } from "@/services/user-profile.service";
import { NextResponse } from "next/server";
import { ClientSideResponseType, NextResponseType } from "@/lib/utilities";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { z } from "zod";

export const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
});

export const GET = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const { page, pageSize } = safeParseQueryParams(req, querySchema);
    const notifications = await ProfileService.getNotifications({
      userId: ctx.userId,
      page,
      pageSize,
    });

    return NextResponse.json(paginatedResponse(notifications, page, pageSize));
  });

export type ResponseType = ClientSideResponseType<NextResponseType<typeof GET>>;
export type RequestQueryParams = z.input<typeof querySchema>;
