import { ReactNode } from "react";
import { PageContextProvider } from "./context";

export default function CompareLayout({ children }: { children: ReactNode }) {
  return <PageContextProvider>{children}</PageContextProvider>;
}

