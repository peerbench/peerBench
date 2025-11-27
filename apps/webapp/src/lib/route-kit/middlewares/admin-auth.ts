import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to authenticate forest-ai.org users only and admin@peerbench.ai
 */
export async function forestAiAuth(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "")
      .trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authToken);

    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user email contains forest-ai.org or admin@peerbench.ai
    if (!user.email || !(user.email.includes("forest-ai.org") || user.email.includes("admin@peerbench.ai"))) {
      return NextResponse.json(
        { message: "Forbidden - Forest AI or PeerBench admin access only" },
        { status: 403 }
      );
    }

    return {
      userId: user.id,
      userEmail: user.email,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

