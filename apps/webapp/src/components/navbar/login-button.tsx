import { Button } from "@/components/ui/button";
import { LucideUser } from "lucide-react";
import Link from "next/link";

export function LoginButton() {
  return (
    <div className="flex items-center gap-2 mr-4">
      <Button asChild variant="ghost">
        <Link href="/login">
          <LucideUser />
          Login
        </Link>
      </Button>
      <Button asChild>
        <Link href="/signup">Sign Up</Link>
      </Button>
    </div>
  );
}
