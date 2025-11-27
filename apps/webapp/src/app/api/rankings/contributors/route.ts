import { db } from "@/database/client";
import { currentContributorScoreView } from "@/database/schema";
import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get total count and paginated data
    const [contributors, countResult] = await Promise.all([
      db
        .select()
        .from(currentContributorScoreView)
        .orderBy(desc(currentContributorScoreView.score))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(currentContributorScoreView),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data: contributors,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + contributors.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching contributor rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributor rankings" },
      { status: 500 }
    );
  }
}

