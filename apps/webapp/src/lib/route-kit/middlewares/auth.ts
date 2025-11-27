import { authenticateRequest } from "@/lib/route-helpers/authenticate-request";
import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to authenticate the request
 */
export async function auth(req: NextRequest) {
  const authResult = await authenticateRequest(req);

  if (authResult.error) {
    return NextResponse.json(
      { message: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  return {
    userId: authResult.userId,
  };
}
