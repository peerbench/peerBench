"use client";

import { useProfile } from "@/lib/react-query/use-profile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { CopyButton } from "../copy-button";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import { LucideUsers, LucideLink } from "lucide-react";
import { DialogProps } from "@radix-ui/react-dialog";

export function InviteFriendsModal(props: DialogProps) {
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const [referralLink, setReferralLink] = useState("");

  // Since we are using `window` object, wrap the state inside a useEffect to avoid hydration errors.
  useEffect(() => {
    setReferralLink(
      `${window.location.origin}/signup?referral=${profile?.referralCode ?? ""}`
    );
  }, [profile?.referralCode]);

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-[800px] w-[calc(100vw-10px)] sm:m-0">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
              <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-full p-3">
                <LucideUsers className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl">Invite Friends</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Share your referral link and invite your friends to join the
            peerBench community! Grow together and unlock new possibilities.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isProfileLoading ? (
            <Skeleton className="w-full h-14" />
          ) : (
            <CopyButton
              text={referralLink}
              variant="outline"
              className="rounded-lg border p-4 justify-between group transition-all duration-200 hover:bg-gray-100"
              disabled={!profile?.referralCode}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <LucideLink className="h-4 w-4 text-primary shrink-0" />
                <div className="text-gray-700 group-hover:text-black font-mono text-sm truncate">
                  {referralLink}
                </div>
              </div>
            </CopyButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
