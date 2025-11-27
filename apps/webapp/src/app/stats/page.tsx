import { getUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { StatsPageClient } from "./components/stats-page-client";
import { LucideBarChart } from "lucide-react";

export default async function StatsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login?redirect=/stats");
  }

  // Check if user has forest-ai.org email
  if (!user.email || !(user.email.includes("forest-ai.org") || user.email.includes("admin@peerbench.ai"))) {
    return (
      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
            Access Denied
          </h1>
          <p className="text-red-700 dark:text-red-300">
            This page is only accessible to Forest AI or PeerBench admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-3">
          <LucideBarChart className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Platform Statistics</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of platform activity and user metrics
        </p>
      </div>
      <StatsPageClient />
    </main>
  );
}

