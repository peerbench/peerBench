import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { ClientSideResponseType, NextResponseType } from "@/lib/utilities";
import { FilterService } from "@/services/filter.service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(500),
});

export const GET = createHandler().handle(async (req) => {
  const query = safeParseQueryParams(req, querySchema);
  const modelSlugs = await FilterService.getModelSlugs(query);
  return NextResponse.json(
    paginatedResponse(modelSlugs, query.page, query.pageSize)
  );
});

export type ResponseType = ClientSideResponseType<NextResponseType<typeof GET>>;
export type RequestQueryParams = z.input<typeof querySchema>;
