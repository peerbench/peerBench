import { LucideLoader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-3">
      <LucideLoader2 className="w-4 h-4 animate-spin" />
      <div className="text-2xl font-bold">Verifying the invitation...</div>
    </div>
  );
}
