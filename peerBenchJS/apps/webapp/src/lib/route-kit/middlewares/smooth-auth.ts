import { authenticateRequest } from "@/lib/route-helpers/authenticate-request";
import { NextRequest } from "next/server";

/**
 * Middleware to include the auth result in the context.
 * Unlike `auth` middleware, this one does not short-circuit the request
 * if the client is not authenticated.
 */
export async function smoothAuth(req: NextRequest) {
  const authResult = await authenticateRequest(req);

  return {
    userId: authResult.userId,
  };
}
