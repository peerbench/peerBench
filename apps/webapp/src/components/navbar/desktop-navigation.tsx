"use client";

import * as React from "react";
import Link from "next/link";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/navbar/navigation-menu";
import { cn } from "@/utils/cn";
import { isNeedAuth, isNeedExtra, links } from "./links";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";
import { User } from "@supabase/supabase-js";

export function DesktopNavigation({ 
  user, 
  onlyExternal = false 
}: { 
  user: User | null;
  onlyExternal?: boolean;
}) {
  const [isExtraEnabled] = useSettingExtra();

  return (
    <div className="hidden lg:block">
      <NavigationMenuList>
        {links
          .filter(
            (link) =>
              // Filter by external flag if onlyExternal is true
              (onlyExternal ? link.external === true : link.external !== true) &&
              // Check conditions for the links that should be visible if the extra is enabled
              isNeedExtra(link, isExtraEnabled) &&
              // Check if user is authenticated for the links that require authentication
              isNeedAuth(link, user)
          )
          .map((link, i) => (
            <NavigationMenuItem key={i}>
              {link.menu ? (
                <>
                  <NavigationMenuTrigger>
                    <div className="flex flex-row items-center gap-2">
                      {link.icon}
                      {link.label}
                    </div>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul
                      className={cn("grid gap-2", {
                        "w-[500px]": link.menu.length % 2 === 0,
                        "w-[400px]": link.menu.length % 2 !== 0,
                        "grid-cols-2": link.menu.length % 2 === 0,
                      })}
                    >
                      {link.menu
                        .filter(
                          (component) =>
                            isNeedExtra(component, isExtraEnabled) &&
                            isNeedAuth(component, user)
                        )
                        .map((component) => (
                          <ListItem
                            key={component.label}
                            title={component.label}
                            href={component.href}
                            icon={component.icon}
                          >
                            {component.description}
                          </ListItem>
                        ))}
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : link.external ? (
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={(link as any).iconOnly ? "flex items-center" : "flex flex-row items-center gap-2"}
                  >
                    {link.icon}
                    {!(link as any).iconOnly && link.label}
                    {(link as any).iconSuffix}
                  </a>
                </NavigationMenuLink>
              ) : (
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link
                    href={link.href}
                    className="flex flex-row items-center gap-2"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
      </NavigationMenuList>
    </div>
  );
}

function ListItem({
  title,
  children,
  href,
  icon,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href} className="flex flex-col space-y-1 h-full">
          <div className="flex flex-row items-center gap-2">
            {icon}
            <div className="text-sm leading-none font-medium">{title}</div>
          </div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
