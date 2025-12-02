import Redirect from "@/components/redirect";
import { ApiKeyProviders } from "@/database/types";
import { ApiKeyService } from "@/services/apikey.service";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { OpenRouterApiKeySetter } from "./openrouter-apikey-setter";
import { PromptSetService } from "@/services/promptset.service";
import { ProfileService } from "@/services/user-profile.service";

type PageProps = {
  searchParams: Promise<{
    code?: string;
    invitation?: string;
    referral?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { code, invitation, referral } = await searchParams;
  const client = await createClient();

  if (!code) {
    redirect("/");
  }

  // Verify Supabase confirmation code
  const authResult = await client.auth.verifyOtp({
    type: "email",
    token_hash: code,
  });

  if (authResult.error || !authResult.data.session) {
    return (
      <main className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-sm text-gray-500">
          {authResult.error?.message || "Unknown error"}
        </p>
      </main>
    );
  }

  // TODO: In case if the user creation was successful but there is a race condition between that newly created user and another user who are using the same invitation code, the user will remain as created but wouldn't be added to the target Prompt Set (because other user has used the invitation code and the `useInvitation` call below failed.)
  if (invitation) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await PromptSetService.useInvitation({
      code: invitation,
      userId: authResult.data.session.user.id,
    }).catch((err) => {
      // Ignore the error if the invitation code is invalid
      console.error(`Error while using invitation code: ${err.message}`);
    });
  }

  if (referral) {
    await ProfileService.setInviter({
      userId: authResult.data.session.user.id,
      referralCode: referral,
    }).catch((err) => {
      // Ignore the error if the referral code is invalid
      console.error(`Error while applying referral code: ${err.message}`);
    });
  }

  // Provision a new one key or get it from the database (if there is already one)
  const keyData = await ApiKeyService.upsertOpenRouterApiKey({
    assignedUserId: authResult.data.session.user.id,
  }).catch((err) => {
    // In case of error just log it and continue.
    console.error(err);
    return undefined;
  });

  return (
    <main className="h-[calc(100vh-100px)] flex flex-col items-center justify-center">
      {/* Use dummy component to update local storage with the key */}
      <OpenRouterApiKeySetter
        apiKey={keyData?.key}
        provider={ApiKeyProviders.openrouter}
      />
      <h2 className="text-2xl font-bold text-green-500">
        Your account is confirmed
      </h2>
      <p className="text-gray-400">
        You&apos;ll be redirected to the login page in 5 seconds...
      </p>
      <Redirect
        to={`/login?redirect=${encodeURIComponent("benchmarks/explore")}`}
        timeout={5000}
      />
    </main>
  );
}
