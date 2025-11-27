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

    // Get benchmarks (prompt sets) created per day
    const benchmarksStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(COUNT(ps.id), 0)::int AS count
      FROM date_series ds
      LEFT JOIN prompt_sets ps ON DATE(ps.created_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);

    // Get prompts created per day
    const promptsStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(COUNT(p.id), 0)::int AS count
      FROM date_series ds
      LEFT JOIN prompts p ON DATE(p.created_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);

    // Get comments created per day (all three types combined)
    const commentsStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      ),
      all_comments AS (
        SELECT created_at FROM prompt_comments
        UNION ALL
        SELECT created_at FROM response_comments
        UNION ALL
        SELECT created_at FROM score_comments
      )
      SELECT 
        ds.date,
        COALESCE(COUNT(ac.created_at), 0)::int AS count
      FROM date_series ds
      LEFT JOIN all_comments ac ON DATE(ac.created_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);

    // Get quick feedbacks created per day
    const quickFeedbacksStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(COUNT(qf.id), 0)::int AS count
      FROM date_series ds
      LEFT JOIN quick_feedbacks qf ON DATE(qf.created_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);

    // Get responses created per day
    const responsesStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(COUNT(r.id), 0)::int AS count
      FROM date_series ds
      LEFT JOIN responses r ON DATE(r.created_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);

    // Get scores created per day
    const scoresStats = await db.execute(sql`
      WITH date_series AS (
        SELECT 
          generate_series(
            CURRENT_DATE - INTERVAL '${sql.raw(daysAgo.toString())} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(COUNT(s.id), 0)::int AS count
      FROM date_series ds
      LEFT JOIN scores s ON DATE(s.created_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);

    return NextResponse.json({
      benchmarks: benchmarksStats.rows,
      prompts: promptsStats.rows,
      comments: commentsStats.rows,
      quickFeedbacks: quickFeedbacksStats.rows,
      responses: responsesStats.rows,
      scores: scoresStats.rows,
    });
  });

export type ResponseType = {
  benchmarks: { date: string; count: number }[];
  prompts: { date: string; count: number }[];
  comments: { date: string; count: number }[];
  quickFeedbacks: { date: string; count: number }[];
  responses: { date: string; count: number }[];
  scores: { date: string; count: number }[];
};

