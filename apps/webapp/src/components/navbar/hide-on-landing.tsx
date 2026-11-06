"use client";

import { usePathname } from "next/navigation";

// The landing page at "/" is a standalone static page; every other route keeps the platform navbar.
export function HideOnLanding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return <>{children}</>;
}
