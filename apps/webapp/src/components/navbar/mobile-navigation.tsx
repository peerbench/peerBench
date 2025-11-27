"use client";

import Link from "next/link";
import { isNeedAuth, isNeedExtra, links } from "./links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";
import { User } from "@supabase/supabase-js";

export function MobileNavigation({ user }: { user: User | null }) {
  const [isExtraEnabled] = useSettingExtra();

  return (
    <div className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:cursor-pointer inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-screen max-w-none mx-0 rounded-none border-0 shadow-lg bg-blue-50 dark:bg-gray-900"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {links
              .filter(
                (link) =>
                  isNeedExtra(link, isExtraEnabled) && isNeedAuth(link, user)
              )
              .map((link, i) => (
                <div key={i}>
                  {link.menu ? (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          {link.icon}
                          {link.label}
                        </div>
                      </div>
                      <div className="pl-6 space-y-1">
                        {link.menu.map((menuItem, menuIndex) => (
                          <DropdownMenuItem key={menuIndex} asChild>
                            <Link
                              href={menuItem.href}
                              className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {menuItem.icon}
                                <div>
                                  <div className="font-medium">
                                    {menuItem.label}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {menuItem.description}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      {i <
                        links.filter(
                          (link) =>
                            isNeedExtra(link, isExtraEnabled) &&
                            isNeedAuth(link, user)
                        ).length -
                          1 && <DropdownMenuSeparator className="my-2" />}
                    </div>
                  ) : link.external ? (
                    <DropdownMenuItem asChild>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                      >
                        <div className={(link as any).iconOnly ? "flex items-center justify-center" : "flex items-center gap-2"}>
                          {link.icon}
                          {!(link as any).iconOnly && link.label}
                          {(link as any).iconSuffix}
                        </div>
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link
                        href={link.href}
                        className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {link.icon}
                          {link.label}
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </div>
              ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
