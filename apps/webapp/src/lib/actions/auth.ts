"use server";

import "server-only";
import { createClient } from "@/utils/supabase/server";
import { ADMIN_USER_ID } from "../constants";

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

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getAdminUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  if (user.id !== ADMIN_USER_ID) {
    return null;
  }

  return user;
}
