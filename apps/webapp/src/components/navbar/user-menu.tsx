"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LucideSettings,
  LucideLogOut,
  LucideLoader2,
  LucideUser,
  LucideFileText,
  LucideActivity,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LoginButton } from "./login-button";
import { useProfile } from "@/lib/react-query/use-profile";
import { Skeleton } from "@/components/ui/skeleton";

const menuItems = [
  {
    label: "My Profile",
    href: "/profile",
    icon: <LucideUser className="w-5 h-5" />,
  },
  {
    label: "My Activity",
    href: "/myActivity",
    icon: <LucideActivity className="w-5 h-5" />,
  },
  {
    label: "Manage Documents",
    href: "/supporting-documents",
    icon: <LucideFileText className="w-5 h-5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <LucideSettings className="w-5 h-5" />,
  },
  {
    type: "separator",
  },
  {
    label: "Sign out",
    action: "signOut",
    icon: <LucideLogOut className="w-5 h-5" />,
  },
];

export function UserMenu({ user }: { user: User | null }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const client = createClient();

  if (!user) {
    return <LoginButton />;
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    client.auth
      .signOut()
      // TODO: Clearing the SWR caches and triggering the server components would be a better solution rather than a full page reload
      .then(() => (window.location.href = "/"))
      .catch((error) => console.error("Error signing out:", error))
      .finally(() => setIsSigningOut(false));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex duration-300 transition-colors p-2 rounded-md items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-700 hover:bg-gray-200 dark:hover:text-gray-300 hover:cursor-pointer">
          <div className="flex items-center space-x-2">
            <span className="hidden md:block text-sm">
              {isProfileLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                profile?.displayName || profile?.id
              )}
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300">
              {isProfileLoading ? (
                <LucideUser size={16} />
              ) : profile?.displayName ? (
                profile.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              ) : (
                <LucideUser size={16} />
              )}
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-[220px] bg-white dark:bg-gray-800 rounded-md p-1 shadow-lg border border-gray-200 dark:border-gray-700 z-[110]"
        sideOffset={5}
        align="end"
      >
        {menuItems.map((item, index) => {
          if (item.type === "separator") {
            return (
              <DropdownMenuSeparator
                key={index}
                className="h-px bg-gray-200 dark:bg-gray-700 my-1"
              />
            );
          }

          if (item.action === "signOut") {
            return (
              <DropdownMenuItem key={index} asChild>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full text-left flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <LucideLoader2 className="animate-spin h-5 w-5 text-gray-700 dark:text-gray-300" />
                  ) : (
                    item.icon
                  )}
                  <span>{isSigningOut ? "Signing out..." : item.label}</span>
                </button>
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem key={index} asChild>
              <Link
                href={item.href!}
                className="w-full text-left flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm outline-none cursor-pointer"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
