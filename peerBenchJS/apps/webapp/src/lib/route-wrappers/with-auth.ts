import {
  authenticateRequest,
  AuthResult,
} from "@/lib/route-helpers/authenticate-request";
import { MaybePromise } from "peerbench";
import { NextRequest, NextResponse } from "next/server";

/**
 * Modifies the request handler to be protected
 * @deprecated use `createHandler` with `auth` instead
 */
export function withAuth<T, K>(
  handler: (req: NextRequest, params: K, auth: AuthResult) => MaybePromise<T>
) {
  return async (req: NextRequest, params: K) => {
    const authResult = await authenticateRequest(req);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    return handler(req, params, authResult);
  };
}
