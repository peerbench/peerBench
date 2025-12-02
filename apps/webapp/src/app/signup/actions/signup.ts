"use server";

import "server-only";
import { PromptSetService } from "@/services/promptset.service";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

export async function signUp(
  email: string,
  password: string,
  params: {
    invitationCode?: string;
    referralCode?: string;
  } = {}
) {
  try {
    const validation = z
      .object({
        email: z.string().email(),
        password: z.string(),
      })
      .safeParse({ email, password });

    if (!validation.success) {
      return {
        error: validation.error.message,
      };
    }

    // Check validity of the invitation code if provided
    if (params.invitationCode) {
      const invitation = await PromptSetService.checkInvitationCode({
        code: params.invitationCode,
      });

      if (!invitation) {
        return {
          error: "Invalid invitation code",
        };
      }
    }

    // Create the user
    const supabase = await createClient();
    const userCreationResult = await supabase.auth.admin.createUser({
      email,
      password,
    });

    if (userCreationResult.error) {
      return {
        error: userCreationResult.error.message,
      };
    }

    const queryParams = new URLSearchParams();
    if (params.invitationCode) {
      queryParams.set("invitation", params.invitationCode);
    }
    if (params.referralCode) {
      queryParams.set("referral", params.referralCode);
    }

    // Send confirmation link
    const confirmationLinkSendResult = await supabase.auth.resend({
      email,
      type: "signup",
      options: {
        emailRedirectTo: `${process.env.PUBLIC_SITE_URL}/signup/confirm?${queryParams.toString()}`,
      },
    });

    if (confirmationLinkSendResult.error) {
      console.error(
        `Confirmation link send failed: ${confirmationLinkSendResult.error.message}`
      );
    }

    return {
      data: userCreationResult.data.user,
    };
  } catch (err) {
    console.error(err);
    return {
      error: `Something went wrong`,
    };
  }
}
