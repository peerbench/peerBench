import { createHandler } from "@/lib/route-kit";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * This is the endpoint that the password reset email will redirect to.
 */
export const GET = createHandler().handle(async (req) => {
  const token_hash = req.nextUrl.searchParams.get("token_hash");

  // No token is presented, redirect to home
  if (!token_hash) {
    return NextResponse.redirect("/");
  }

  const client = await createClient();
  const next = req.nextUrl.clone();
  const sessionResult = await client.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });

  // No need to keep the token_hash in the URL
  // (either the rest of the workflow fails or succeeds)
  next.searchParams.delete("token_hash");

  next.pathname = "/reset-password";

  if (sessionResult.error) {
    console.error("Error verifying reset password token:", sessionResult.error);
    // Let the reset password page know to show an error message
    next.searchParams.set("error", "true");
    return NextResponse.redirect(next);
  }

  return NextResponse.redirect(next);
});
