import { createHandler } from "@/lib/route-kit";
import { forestAiAuth } from "@/lib/route-kit/middlewares/admin-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { sql } from "drizzle-orm";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const GET = createHandler()
  .use(forestAiAuth)
  .handle(async (req) => {
    const query = safeParseQueryParams(req, querySchema);
    const daysAgo = query.days;

    // Query to get daily user registrations with org affiliation status and cumulative totals
    const dailyStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      ),
      daily_users AS (
        SELECT 
          DATE(email_confirmed_at) AS registration_date,
          u.id AS user_id,
          CASE WHEN otp.user_id IS NOT NULL THEN 1 ELSE 0 END AS has_org
        FROM auth.users u
        LEFT JOIN org_to_people otp ON u.id = otp.user_id
        WHERE u.email_confirmed_at IS NOT NULL
          AND DATE(u.email_confirmed_at) >= CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days'
      ),
      daily_counts AS (
        SELECT 
          ds.date,
          COALESCE(SUM(CASE WHEN du.has_org = 1 THEN 1 ELSE 0 END), 0)::int AS users_with_org,
          COALESCE(SUM(CASE WHEN du.has_org = 0 THEN 1 ELSE 0 END), 0)::int AS users_without_org,
          COALESCE(COUNT(du.user_id), 0)::int AS total_users
        FROM date_series ds
        LEFT JOIN daily_users du ON ds.date = du.registration_date
        GROUP BY ds.date
      ),
      users_before_period AS (
        SELECT COUNT(*)::int AS count
        FROM auth.users
        WHERE email_confirmed_at IS NOT NULL
          AND DATE(email_confirmed_at) < CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days'
      )
      SELECT 
        dc.date,
        dc.users_with_org,
        dc.users_without_org,
        dc.total_users,
        (SELECT count FROM users_before_period) + 
          SUM(dc.total_users) OVER (ORDER BY dc.date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::int 
          AS cumulative_total
      FROM daily_counts dc
      ORDER BY dc.date ASC
    `);

    // Get total user count
    const totalUsersResult = await db.execute(sql`
      SELECT COUNT(DISTINCT u.id)::int AS total
      FROM auth.users u
      WHERE u.email_confirmed_at IS NOT NULL
    `);

    return NextResponse.json({
      dailyStats: dailyStats.rows,
      totalUsers: totalUsersResult.rows[0]?.total || 0,
    });
  });

export type ResponseType = {
  dailyStats: {
    date: string;
    users_with_org: number;
    users_without_org: number;
    total_users: number;
    cumulative_total: number;
  }[];
  totalUsers: number;
};

