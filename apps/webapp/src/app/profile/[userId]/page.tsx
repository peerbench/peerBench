import Profile from "../components/profile";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const userId = (await params).userId;

  return (
    <main className="max-w-6xl mx-auto py-8 bg-background">
      {/* If user is trying to access another user's profile, render the public version of it */}
      <Profile userId={userId} publicProfile />{" "}
    </main>
  );
}
