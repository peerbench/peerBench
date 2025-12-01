"use client";

import { Button } from "../ui/button";
import { UserRoleOnPromptSet } from "@/database/types";
import {
  LucideCalendarDays,
  LucideMoreHorizontal,
  LucideTrash2,
  LucideLoader2,
  LucideExternalLink,
  LucideInfinity,
  LucideZap,
} from "lucide-react";
import { DateTime } from "luxon";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { toast } from "react-toastify";
import { CopyButton } from "../copy-button";
import { InvitationItem } from "@/lib/hooks/use-prompt-set-api";

export interface InvitationLinksTableRowProps {
  hasUserEditPermission?: boolean;
  invitation: InvitationItem;
  promptSetId: number;
  onRevoke: (code: string) => Promise<void>;
}

export default function InvitationLinksTableRow({
  invitation,
  hasUserEditPermission,
  onRevoke,
}: InvitationLinksTableRowProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleRevoke = async () => {
    if (isRevoking) return;

    try {
      setIsRevoking(true);
      setIsDisabled(true);
      await onRevoke(invitation.code);
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke invitation");
      setIsDisabled(false);
    } finally {
      setIsRevoking(false);
    }
  };

  const canRevoke =
    hasUserEditPermission && !invitation.usedAt && !invitation.revokedAt;
  const isUsed = !!invitation.usedAt;
  const isRevoked = !!invitation.revokedAt;

  const getInvitationLink = () => {
    return `${window.location.origin}/benchmarks/invite/${invitation.code}`;
  };

  const getStatusBadge = () => {
    if (isRevoked) {
      return (
        <Badge variant="destructive" className="text-xs">
          Revoked
        </Badge>
      );
    }
    if (isUsed) {
      return (
        <Badge variant="secondary" className="text-xs">
          Used
        </Badge>
      );
    }
    return (
      <Badge
        variant="default"
        className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
      >
        Active
      </Badge>
    );
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        isDisabled
          ? "opacity-50 pointer-events-none"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
    >
      {/* Header with icon, badges, and actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <LucideExternalLink className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getRoleColor(invitation.role)}>
              {getRoleLabel(invitation.role)}
            </Badge>
            {invitation.isReusable ? (
              <Badge
                variant="outline"
                className="text-xs bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
              >
                <LucideInfinity className="h-3 w-3 mr-1" />
                Reusable
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
              >
                <LucideZap className="h-3 w-3 mr-1" />
                One-time
              </Badge>
            )}
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Copy Link Button */}
          <CopyButton
            text={getInvitationLink()}
            label="Copy invitation link"
            variant="outline"
            className="h-8 text-xs"
            disabled={isDisabled || isUsed || isRevoked}
          />

          {/* Actions Menu */}
          {canRevoke && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isDisabled}
                >
                  {isRevoking ? (
                    <LucideLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LucideMoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={isRevoking}
                  className="cursor-pointer"
                >
                  <LucideTrash2 className="h-4 w-4 mr-2" />
                  Revoke Invitation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <LucideCalendarDays className="h-4 w-4 flex-shrink-0" />
        <span>
          Created {DateTime.fromISO(invitation.createdAt).toFormat("TTT, DD")}
        </span>
        {isUsed && (
          <>
            <span>•</span>
            <span>
              Used {DateTime.fromISO(invitation.usedAt!).toFormat("TTT, DD")}
            </span>
          </>
        )}
        {isRevoked && (
          <>
            <span>•</span>
            <span>
              Revoked{" "}
              {DateTime.fromISO(invitation.revokedAt!).toFormat("TTT, DD")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const getRoleColor = (role: UserRoleOnPromptSet) => {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
    case "collaborator":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
    case "reviewer":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
  }
};

const getRoleLabel = (role: UserRoleOnPromptSet) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "collaborator":
      return "Collaborator";
    case "reviewer":
      return "Reviewer";
    default:
      return role;
  }
};
