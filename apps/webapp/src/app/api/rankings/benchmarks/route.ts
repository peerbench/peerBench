import { db } from "@/database/client";
import { currentBenchmarkQualityView } from "@/database/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const benchmarks = await db
      .select()
      .from(currentBenchmarkQualityView)
      .orderBy(desc(currentBenchmarkQualityView.qualityScore))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: benchmarks,
      pagination: {
        limit,
        offset,
        total: benchmarks.length,
      },
    });
  } catch (error) {
    console.error("Error fetching benchmark quality rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch benchmark quality rankings" },
      { status: 500 }
    );
  }
}

