"use client";

import { PageContextProvider } from "./context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PageContextProvider>{children}</PageContextProvider>;
}
