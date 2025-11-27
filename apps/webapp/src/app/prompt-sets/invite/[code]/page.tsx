import Redirect from "@/components/redirect";
import { ApiError } from "@/errors/api-error";
import { getUser } from "@/lib/actions/auth";
import { PromptSetService } from "@/services/promptset.service";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    code?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const code = await params.then((p) =>
    p.code ? decodeURI(p.code) : undefined
  );
  if (!code) {
    redirect("/");
  }

  const user = await getUser();

  // User is not logged, redirect to the signup page with the invitation code
  if (!user) {
    redirect(`/signup?code=${encodeURI(code)}`);
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await PromptSetService.useInvitation({
      code,
      userId: user.id,
    });

    return (
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold">Success</h1>
        <p className="text-sm text-gray-500">
          Invitation validated and accepted. You can now start contributing! Redirecting to the dashboard in 5
          seconds...
        </p>
        <Redirect timeout={5000} to="/prompt-sets" />
      </div>
    );
  } catch (err) {
    // ApiErrors are safe to render on the UI,
    if (err instanceof ApiError) {
      return (
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-sm text-red-500">
            Failed to use the invitation: {err.message}
          </p>
        </div>
      );
    }

    // Otherwise just rethrow it so the outer error boundary will catch it.
    throw err;
  }
}
