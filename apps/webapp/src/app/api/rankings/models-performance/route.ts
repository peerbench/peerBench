import { db } from "@/database/client";
import { currentModelPerformanceView } from "@/database/schema";
import { desc, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const minPromptsCount = parseInt(
      searchParams.get("minPrompts") || "5",
      10
    );

    // Get total count and paginated data
    const [models, countResult] = await Promise.all([
      db
        .select()
        .from(currentModelPerformanceView)
        .where(
          gte(currentModelPerformanceView.promptsTestedCount, minPromptsCount)
        )
        .orderBy(desc(currentModelPerformanceView.score))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(currentModelPerformanceView)
        .where(
          gte(currentModelPerformanceView.promptsTestedCount, minPromptsCount)
        ),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data: models,
      pagination: {
        limit,
        offset,
        minPromptsCount,
        total: totalCount,
        hasMore: offset + models.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching model rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch model rankings" },
      { status: 500 }
    );
  }
}

