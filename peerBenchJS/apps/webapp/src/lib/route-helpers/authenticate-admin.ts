import { authenticateRequest } from "./authenticate-request";
import { AdminService } from "@/services/admin.service";

export type AdminAuthResult = {
  userId: string;
  error?: never;
};

export type AdminAuthError = {
  userId?: never;
  error: {
    message: string;
    status: number;
  };
};

export type AdminAuthResponse = AdminAuthResult | AdminAuthError;

/**
 * Authenticates a request and checks if the user is an admin
 *
 * @param request - The request to authenticate
 * @returns The user ID if the request is authenticated and user is admin, otherwise an error
 * @example
 * ```ts
 * export async function GET(request: Request) {
 *   const authResult = await authenticateAdmin(request);
 *   if (authResult.error) {
 *     return NextResponse.json(
 *       { error: authResult.error.message },
 *       { status: authResult.error.status }
 *     );
 *   }
 *
 *   const userId = authResult.userId;
 *   // User is authenticated and is an admin
 * }
 * ```
 */
export async function authenticateAdmin(
  request: Request
): Promise<AdminAuthResponse> {
  // First authenticate the request
  const authResult = await authenticateRequest(request);

  if (authResult.error) {
    return authResult;
  }

  // Check if user is admin
  const isAdmin = await AdminService.isAdmin(authResult.userId);

  if (!isAdmin) {
    return {
      error: {
        message: "Forbidden: Admin access required",
        status: 403,
      },
    };
  }

  return { userId: authResult.userId };
}
