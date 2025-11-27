import { db } from "@/database/client";
import { currentPromptQualityView } from "@/database/schema";
import { desc, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const minQuality = parseFloat(searchParams.get("minQuality") || "0");

    const prompts = await db
      .select()
      .from(currentPromptQualityView)
      .where(gte(currentPromptQualityView.qualityScore, minQuality))
      .orderBy(desc(currentPromptQualityView.qualityScore))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: prompts,
      pagination: {
        limit,
        offset,
        minQuality,
        total: prompts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching prompt quality rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt quality rankings" },
      { status: 500 }
    );
  }
}

