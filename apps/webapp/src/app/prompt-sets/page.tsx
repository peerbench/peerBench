import { Filters } from "./components/filters";
import { PromptSetList } from "./components/prompt-set-list";
import { LucideSearch } from "lucide-react";

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <LucideSearch className="h-8 w-8 text-black dark:text-white" />
        <h1 className="text-3xl font-bold">Benchmarks</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Browse and explore available Benchmarks for testing and reviewing.
      </p>
      <div className="space-y-4">
        <Filters />
        <PromptSetList />
      </div>
    </main>
  );
}
