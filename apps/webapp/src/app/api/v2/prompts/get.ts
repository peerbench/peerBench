import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { PromptService } from "@/services/prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { NULL_UUID } from "@/lib/constants";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";
import { ClientSideResponseType, NextResponseType } from "@/lib/utilities";

export const querySchema = promptFiltersSchema.extend({
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(10),
  orderBy: z
    .array(
      z.string().transform((val, ctx) => {
        const [key, direction] = val.split("_");
        if (key === undefined || direction === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid order format",
            path: ["orderBy"],
          });
          return z.NEVER;
        }

        if (!["createdAt", "question", "random"].includes(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid orderBy key",
            path: ["orderBy"],
          });
          return z.NEVER;
        }

        if (!["asc", "desc"].includes(direction?.toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid orderBy direction",
            path: ["orderBy"],
          });
          return z.NEVER;
        }

        return { [key]: direction };
      })
    )
    .transform((value) => {
      if (value !== undefined && value.length === 0) return undefined;

      const orderBy: Record<string, "asc" | "desc"> = {};
      for (const curr of value) {
        for (const [key, direction] of Object.entries(curr)) {
          orderBy[key] = direction as "asc" | "desc";
        }
      }
      return orderBy;
    })
    .optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const { accessReason, page, pageSize, orderBy, ...filters } =
      safeParseQueryParams(req, querySchema);

    return NextResponse.json(
      paginatedResponse(
        await PromptService.getPrompts({
          page: page,
          pageSize: pageSize,
          orderBy: orderBy,
          accessReason,
          requestedByUserId: ctx.userId ?? NULL_UUID,
          filters,
        }),
        page,
        pageSize
      )
    );
  });

export type ResponseType = ClientSideResponseType<NextResponseType<typeof GET>>;
export type RequestQueryParams = z.input<typeof querySchema>;
