import { createHandler } from "@/lib/route-kit";
import { forestAiAuth } from "@/lib/route-kit/middlewares/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { sql } from "drizzle-orm";

export const GET = createHandler()
  .use(forestAiAuth)
  .handle(async (req: NextRequest) => {
    // Get days parameter from query string (default to null for all time)
    const searchParams = req.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : null;
    
    // Calculate the date threshold if days is provided
    const dateThreshold = days
      ? sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`
      : null;

    // Get comprehensive user stats
    const usersStats = await db.execute(sql`
      WITH user_benchmarks AS (
        SELECT 
          owner_id,
          COUNT(*)::int AS benchmarks_created
        FROM prompt_sets
        ${dateThreshold ? sql`WHERE created_at >= ${dateThreshold}` : sql``}
        GROUP BY owner_id
      ),
      user_prompts_own AS (
        SELECT 
          hr.uploader_id,
          COUNT(DISTINCT p.id)::int AS prompts_in_own_benchmarks
        FROM prompts p
        INNER JOIN hash_registrations hr ON p.hash_sha256_registration = hr.sha256 
          AND p.hash_cid_registration = hr.cid
        INNER JOIN prompt_set_prompts psp ON p.id = psp.prompt_id
        INNER JOIN prompt_sets ps ON psp.prompt_set_id = ps.id
        WHERE hr.uploader_id = ps.owner_id
          ${dateThreshold ? sql`AND hr.created_at >= ${dateThreshold}` : sql``}
        GROUP BY hr.uploader_id
      ),
      user_prompts_other AS (
        SELECT 
          hr.uploader_id,
          COUNT(DISTINCT p.id)::int AS prompts_in_other_benchmarks
        FROM prompts p
        INNER JOIN hash_registrations hr ON p.hash_sha256_registration = hr.sha256 
          AND p.hash_cid_registration = hr.cid
        INNER JOIN prompt_set_prompts psp ON p.id = psp.prompt_id
        INNER JOIN prompt_sets ps ON psp.prompt_set_id = ps.id
        WHERE hr.uploader_id != ps.owner_id
          ${dateThreshold ? sql`AND hr.created_at >= ${dateThreshold}` : sql``}
        GROUP BY hr.uploader_id
      ),
      user_comments AS (
        SELECT user_id, COUNT(*)::int AS comments_made FROM (
          SELECT user_id FROM prompt_comments
          ${dateThreshold ? sql`WHERE created_at >= ${dateThreshold}` : sql``}
          UNION ALL
          SELECT user_id FROM response_comments
          ${dateThreshold ? sql`WHERE created_at >= ${dateThreshold}` : sql``}
          UNION ALL
          SELECT user_id FROM score_comments
          ${dateThreshold ? sql`WHERE created_at >= ${dateThreshold}` : sql``}
        ) AS all_comments
        GROUP BY user_id
      ),
      user_quick_feedbacks AS (
        SELECT 
          user_id,
          COUNT(*)::int AS quick_feedbacks_made
        FROM quick_feedbacks
        ${dateThreshold ? sql`WHERE created_at >= ${dateThreshold}` : sql``}
        GROUP BY user_id
      ),
      onboarding_status AS (
        SELECT 
          u.id AS user_id,
          CASE 
            WHEN COALESCE(ub.benchmarks_created, 0) >= 1
              AND COALESCE(upo.prompts_in_own_benchmarks, 0) >= 3
              AND COALESCE(upot.prompts_in_other_benchmarks, 0) >= 3
              AND COALESCE(uc.comments_made, 0) >= 3
              AND COALESCE(uqf.quick_feedbacks_made, 0) >= 3
            THEN true
            ELSE false
          END AS onboarding_complete
        FROM auth.users u
        LEFT JOIN user_benchmarks ub ON u.id = ub.owner_id
        LEFT JOIN user_prompts_own upo ON u.id = upo.uploader_id
        LEFT JOIN user_prompts_other upot ON u.id = upot.uploader_id
        LEFT JOIN user_comments uc ON u.id = uc.user_id
        LEFT JOIN user_quick_feedbacks uqf ON u.id = uqf.user_id
        WHERE u.email_confirmed_at IS NOT NULL
      )
      SELECT 
        u.id,
        u.email,
        u.email_confirmed_at,
        COALESCE(ub.benchmarks_created, 0) AS benchmarks_created,
        COALESCE(upo.prompts_in_own_benchmarks, 0) AS prompts_in_own_benchmarks,
        COALESCE(upot.prompts_in_other_benchmarks, 0) AS prompts_in_other_benchmarks,
        COALESCE(upo.prompts_in_own_benchmarks, 0) + COALESCE(upot.prompts_in_other_benchmarks, 0) AS total_prompts_created,
        COALESCE(uc.comments_made, 0) AS comments_made,
        COALESCE(uqf.quick_feedbacks_made, 0) AS quick_feedbacks_made,
        os.onboarding_complete,
        CASE WHEN otp.user_id IS NOT NULL THEN true ELSE false END AS has_org_affiliation
      FROM auth.users u
      LEFT JOIN user_benchmarks ub ON u.id = ub.owner_id
      LEFT JOIN user_prompts_own upo ON u.id = upo.uploader_id
      LEFT JOIN user_prompts_other upot ON u.id = upot.uploader_id
      LEFT JOIN user_comments uc ON u.id = uc.user_id
      LEFT JOIN user_quick_feedbacks uqf ON u.id = uqf.user_id
      LEFT JOIN onboarding_status os ON u.id = os.user_id
      LEFT JOIN org_to_people otp ON u.id = otp.user_id
      WHERE u.email_confirmed_at IS NOT NULL
      ORDER BY u.email_confirmed_at DESC
    `);

    return NextResponse.json({
      users: usersStats.rows,
    });
  });

export type ResponseType = {
  users: {
    id: string;
    email: string;
    email_confirmed_at: string;
    benchmarks_created: number;
    prompts_in_own_benchmarks: number;
    prompts_in_other_benchmarks: number;
    total_prompts_created: number;
    comments_made: number;
    quick_feedbacks_made: number;
    onboarding_complete: boolean;
    has_org_affiliation: boolean;
  }[];
};

