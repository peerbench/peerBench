"use server";

import { createClient } from "@/utils/supabase/server";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (result.error) {
    return {
      error: result.error.message,
    };
  }

  return result;
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (result.error) {
    return {
      error: result.error.message,
    };
  }

  return result;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  console.log("Requesting password reset for email:", email);
  console.log("Redirect URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`);

  const result = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (result.error) {
    console.error("Password reset request error:", result.error);
    return {
      error: result.error.message,
    };
  }

  console.log("Password reset email sent successfully");
  return result;
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const result = await supabase.auth.updateUser({
    password: password,
  });

  if (result.error) {
    return {
      error: result.error.message,
    };
  }

  return result;
}
