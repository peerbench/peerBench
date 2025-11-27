import { db } from "@/database/client";
import { currentReviewerTrustView } from "@/database/schema";
import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get total count and paginated data
    const [reviewers, countResult] = await Promise.all([
      db
        .select()
        .from(currentReviewerTrustView)
        .orderBy(desc(currentReviewerTrustView.trustScore))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(currentReviewerTrustView),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data: reviewers,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + reviewers.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching reviewer rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviewer rankings" },
      { status: 500 }
    );
  }
}

