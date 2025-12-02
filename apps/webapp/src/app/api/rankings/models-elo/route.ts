import { db } from "@/database/client";
import { currentModelEloView } from "@/database/schema";
import { desc, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const minMatchCount = parseInt(
      searchParams.get("minMatches") || "10",
      10
    );

    // Get total count and paginated data
    const [models, countResult] = await Promise.all([
      db
        .select()
        .from(currentModelEloView)
        .where(gte(currentModelEloView.matchCount, minMatchCount))
        .orderBy(desc(currentModelEloView.eloScore))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(currentModelEloView)
        .where(gte(currentModelEloView.matchCount, minMatchCount)),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data: models,
      pagination: {
        limit,
        offset,
        minMatchCount,
        total: totalCount,
        hasMore: offset + models.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching model ELO rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch model ELO rankings" },
      { status: 500 }
    );
  }
}

