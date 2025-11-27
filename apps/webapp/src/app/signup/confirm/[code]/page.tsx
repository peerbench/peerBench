import Redirect from "@/components/redirect";
import { ApiKeyProviders } from "@/database/types";
import { ApiKeyService } from "@/services/apikey.service";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { OpenRouterApiKeySetter } from "./openrouter-apikey-setter";

type PageProps = {
  params: Promise<{
    code?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { code } = await params;
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
      <Redirect to="/login?redirect=prompt-sets" timeout={5000} />
    </main>
  );
}
