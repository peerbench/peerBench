"use server";

import { createClient } from "@/utils/supabase/server";

export async function sendResetEmail(email: string) {
  const client = await createClient();
  const result = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.PUBLIC_SITE_URL}/api/v1/auth/reset-password`,
  });

  if (result.error) {
    console.error(`Error sending reset email: ${result.error.message}`);
    return { error: "Unknown error" };
  }

  return {
    error: undefined,
  };
}
