import { createClient } from "@/utils/supabase/server";

/**
 * Authenticates a request by checking the Authorization header for a valid
 * Supabase auth token. If the token is not provided in the header then checks
 * the cookie for a valid auth token.
 *
 * @param request - The request to authenticate.
 * @returns The user ID if the request is authenticated, otherwise an error.
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *  const authResult = await authenticateRequest(request);
 *  if (authResult.error) {
 *   return NextResponse.json(
 *     { error: authResult.error.message },
 *     { status: authResult.error.status }
 *   );
 *  }
 *
 *  const userId = authResult.userId;
 *  // use userId to access the database
 * }
 * ```
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResponse> {
  try {
    const supabase = await createClient();
    const authToken = request.headers
      .get("Authorization")
      ?.replace("Bearer ", "")
      .trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authToken);

    if (authError || !user) {
      if (!user) {
        console.error("No user found in auth response");
      }

      if (authError) {
        console.error("Auth error:", JSON.stringify(authError, null, 2));
      }

      return {
        error: {
          message: "Unauthorized",
          status: 401,
        },
      };
    }

    return { userId: user.id };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      error: {
        message: "Internal server error",
        status: 500,
      },
    };
  }
}

export type AuthResult = {
  userId: string;
  error?: never;
};

export type AuthError = {
  userId?: never;
  error: {
    message: string;
    status: number;
  };
};

export type AuthResponse = AuthResult | AuthError;
