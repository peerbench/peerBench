"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export interface RedirectProps {
  timeout: number;
  to?: string;
}

export default function Redirect({ timeout = 5000, to = "/" }: RedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timeoutHandler = setTimeout(() => router.push(to), timeout);

    return () => clearTimeout(timeoutHandler);
  }, [router, timeout, to]);

  return <></>;
}
