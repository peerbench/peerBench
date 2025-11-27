import { getUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import Profile from "./components/profile";

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="max-w-6xl mx-auto py-8 px-4 bg-background">
      <Profile userId={user.id} />
    </main>
  );
}
