import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { ADMIN_USER_ID } from "@/lib/constants";
import { ApiError } from "@/errors/api-error";

/**
 * Middleware to authenticate the request only if
 * the user is an peerBench admin.
 */
export async function authAdmin(req: NextRequest) {
  const authResult = await auth(req);

  // Something went wrong and auth middleware returned a response.
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.userId !== ADMIN_USER_ID) {
    // Pretend the endpoint does not exist.
    throw ApiError.notFound();
  }

  return authResult;
}
