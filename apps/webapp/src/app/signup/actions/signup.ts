"use server";

import "server-only";
import { PromptSetService } from "@/services/promptset.service";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { ProfileService } from "@/services/user-profile.service";

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

    // TODO: In case if the user creation was successful but there is a race condition between that newly created user and another user who are using the same invitation code, the user will remain as created but wouldn't be added to the target Prompt Set (because other user has used the invitation code and the `useInvitation` call below failed.)

    // Use the invitation code if provided
    if (params.invitationCode) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await PromptSetService.useInvitation({
        code: params.invitationCode,
        userId: userCreationResult.data.user.id,
      }).catch((err) => {
        // Ignore the error if the invitation code is invalid
        console.error(`Error while using invitation code: ${err.message}`);
      });
    }

    if (params.referralCode) {
      await ProfileService.setInviter({
        userId: userCreationResult.data.user.id,
        referralCode: params.referralCode,
      }).catch((err) => {
        // Ignore the error if the referral code is invalid
        console.error(`Error while applying referral code: ${err.message}`);
      });
    }

    // Send confirmation link
    const confirmationLinkSendResult = await supabase.auth.resend({
      email,
      type: "signup",
      options: {
        emailRedirectTo: `${process.env.PUBLIC_SITE_URL}/signup/confirm`,
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
