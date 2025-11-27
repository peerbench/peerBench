import PromptsInfiniteList from "@/components/prompts-infinite-list";
import { LucideSearch } from "lucide-react";

export default async function PromptsPage() {
  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 py-8 max-w-7xl">
      <div className="w-full mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LucideSearch className="h-8 w-8 text-black dark:text-white" />
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Prompts
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Search through Prompts
        </p>
      </div>

      <PromptsInfiniteList />
    </main>
  );
}
