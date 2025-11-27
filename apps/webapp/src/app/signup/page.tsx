import { PromptSetService } from "@/services/promptset.service";
import { redirect } from "next/navigation";
import Form from "./components/form";

type PageProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { code } = await searchParams;

  // Allow signup with or without invitation code
  if (code) {
    const invitation = await PromptSetService.checkInvitationCode({
      code,
    });

    // Only redirect if code was provided but is invalid
    if (!invitation) {
      redirect("/");
    }
  }

  return (
    <main className="h-[calc(100vh-100px)] flex items-center justify-center p-4">
      <Form />
    </main>
  );
}
