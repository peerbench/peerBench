"use client";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, ReactNode } from "react";

export type AuthContextType = {
  user: User | null;
};

export function AuthContextProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
}

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Uses the AuthContext that shares the server side verified user object.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthContextProvider");
  }
  return context.user;
}
