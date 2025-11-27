import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { modelMatchesTable } from "@/database/schema";
import { eq } from "drizzle-orm";

export const PATCH = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const { id } = await ctx.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid match ID" },
        { status: 400 }
      );
    }

    // Update the match to be shareable
    const [updatedMatch] = await db
      .update(modelMatchesTable)
      .set({ isShareable: true })
      .where(eq(modelMatchesTable.id, id))
      .returning({ id: modelMatchesTable.id });

    if (!updatedMatch) {
      return NextResponse.json(
        { error: "Model match not found" },
        { status: 404 }
      );
    }

    // Construct the share URL
    const origin = req.headers.get("origin") || "";
    const shareUrl = `${origin}/compare/share/${id}`;

    return NextResponse.json({
      success: true,
      data: {
        shareUrl,
        matchId: id,
      },
    });
  });

export type ResponseType = {
  success: boolean;
  data: {
    shareUrl: string;
    matchId: string;
  };
};

