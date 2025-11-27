import { checkValidation } from "@/lib/route-helpers/check-validation";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { parseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { PromptSetService } from "@/services/promptset.service";
import { PaginatedResponse } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().max(1000).optional().default(10),
  search: z.string().optional(),
});

export const GET = createHandler().handle(async (req) => {
  const query = checkValidation(
    querySchema.safeParse(
      parseQueryParams(req, {
        page: false,
        pageSize: false,
        search: false,
      })
    )
  );

  return NextResponse.json(
    paginatedResponse(
      await PromptSetService.getCategories({
        page: query.page,
        pageSize: query.pageSize,
        filters: {
          search: query.search,
        },
      }),
      query.page,
      query.pageSize
    )
  );
});

export type ResponseType = PaginatedResponse<string>;
export type RequestQueryParams = z.infer<typeof querySchema>;
