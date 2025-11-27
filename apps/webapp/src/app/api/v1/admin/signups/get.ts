import { NextResponse } from "next/server";
import { AdminService } from "@/services/admin.service";
import { createHandler } from "@/lib/route-kit";
import { authAdmin } from "@/lib/route-kit/middlewares/auth-admin";
import { z } from "zod";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { ApiError } from "@/errors/api-error";

const querySchema = z.object({
  /**
   * The period of time to look back at.
   */
  period: z.enum(["daily", "weekly"]).default("daily"),

  /**
   * The number of days to look back at.
   */
  days: z.coerce.number().int().min(1).max(365).default(90),

  /**
   * The number of weeks to look back at.
   */
  weeks: z.coerce.number().int().min(1).max(52).default(12),
});

/**
 * Get signup trends over time (daily or weekly)
 */
export const GET = createHandler()
  .use(authAdmin)
  .handle(async (request) => {
    try {
      const { period, days, weeks } = safeParseQueryParams(
        request,
        querySchema
      );

      let trends;
      if (period === "weekly") {
        trends = await AdminService.getWeeklySignupTrends(weeks);
      } else {
        trends = await AdminService.getSignupTrends(days);
      }

      return NextResponse.json({
        period,
        trends,
        total: trends.length,
      });
    } catch (error) {
      console.error("Error fetching signup trends:", error);
      throw ApiError.server("Failed to fetch signup trends");
    }
  });
