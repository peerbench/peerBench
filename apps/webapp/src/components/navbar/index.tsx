import { UserMenu } from "./user-menu";
import { MobileNavigation } from "./mobile-navigation";
import { NavigationMenu } from "@/components/navbar/navigation-menu";
import { DesktopNavigation } from "./desktop-navigation";
import { Notifications } from "./notifications";
import { getUser } from "@/lib/actions/auth";
import Link from "next/link";
import Image from "next/image";

export default async function Navbar() {
  const user = await getUser();

  return (
    <NavigationMenu
      viewport={false}
      className="max-w-full justify-start sticky top-0 z-10 h-(--navbar-height)"
    >
      <Link
        href="/"
        className="flex items-center text-xl mx-4 my-2"
      >
        <Image src="/logo-gradient.svg" alt="peerBench" width={50} height={50} className="mx-1 p-1" />
        <span className="text-[#2E86C1]">PeerBench.ai</span>
      </Link>

      {/* Desktop Navigation */}
      <DesktopNavigation user={user} />

      <div className="flex-1" />

      {/* Onboarding Tutorial - aligned to right */}
      <DesktopNavigation user={user} onlyExternal />

      {user && <Notifications />}
      <UserMenu user={user} />
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <MobileNavigation user={user} />
      </div>
    </NavigationMenu>
  );
}
