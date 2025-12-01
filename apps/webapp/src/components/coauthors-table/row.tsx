"use client";

import { Button } from "../ui/button";
import { UserRoleOnPromptSet } from "@/database/types";
import {
  LucideCalendarDays,
  LucideMoreHorizontal,
  LucideUser2,
  LucideTrash2,
  LucideLoader2,
} from "lucide-react";
import { DateTime } from "luxon";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { roleOptions } from "@/lib/options";
import { cn } from "@/utils/cn";
import { CoAuthorItem, usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { useAuth } from "../providers/auth";

export interface CoauthorsTableRowProps {
  promptSetId: number;
  coauthor: CoAuthorItem;
  hasUserEditPermission?: boolean;
  hasUserRemovePermission?: boolean;
  isPromptSetPublic?: boolean;
}

export default function CoauthorsTableRow({
  coauthor,
  hasUserEditPermission,
  hasUserRemovePermission,
  isPromptSetPublic,
  promptSetId,
}: CoauthorsTableRowProps) {
  const user = useAuth();
  const promptSetAPI = usePromptSetAPI();
  const [coAuthorRole, setCoAuthorRole] = useState<UserRoleOnPromptSet | null>(
    coauthor.role
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleDelete = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setIsDisabled(true);
      await promptSetAPI.removeCoAuthor(promptSetId, coauthor.userId);
      toast.success("Co-author removed successfully");
    } catch (error) {
      console.error(error);
      toast.error(`Failed to remove coauthor: ${errorMessage(error)}`);
      setIsDisabled(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (newRole: UserRoleOnPromptSet) => {
    if (isProcessing || !coAuthorRole || newRole === coAuthorRole) return;

    try {
      setIsProcessing(true);
      await promptSetAPI.updateCoAuthorRole(promptSetId, coauthor.userId, {
        newRole,
      });

      // Update the local state so we can render the new role
      // Then in the next fetch, the updated role will be fetched from the API
      // and local state will use it as the default value and so on...
      setCoAuthorRole(newRole);
      toast.success("Role updated successfully");

      // TODO: If the updated role was belong to this user, then check if it still has enough permissions to see/edit roles
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update role: ${errorMessage(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDeletable =
    hasUserRemovePermission &&
    coAuthorRole &&
    coAuthorRole !== UserRoleOnPromptSet.owner;
  const isChangeable =
    hasUserEditPermission &&
    coAuthorRole &&
    coAuthorRole !== UserRoleOnPromptSet.owner;

  const filteredRoleOptions = isPromptSetPublic
    ? roleOptions.filter((option) => option.value === UserRoleOnPromptSet.admin)
    : roleOptions;

  // Sync local state with the one that passed from the parent
  useEffect(() => {
    setCoAuthorRole(coauthor.role);
  }, [coauthor.role]);

  return (
    <div
      key={coauthor.userId}
      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
        isDisabled
          ? "opacity-50 pointer-events-none"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {coauthor.displayName ? (
              coauthor.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            ) : (
              <LucideUser2 />
            )}
          </span>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-md">
            {coauthor.displayName} {user?.id === coauthor.userId && "(You)"}
          </h3>
          <h4 className="text-sm text-gray-500 dark:text-gray-400">
            {coauthor.displayName}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {coauthor.userId}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          {coAuthorRole && (
            <>
              {isChangeable ? (
                <Select
                  value={coAuthorRole}
                  onValueChange={handleRoleChange}
                  disabled={isDisabled || isProcessing}
                >
                  <SelectTrigger
                    className={cn(
                      getRoleColor(coAuthorRole),
                      "text-xs rounded-full"
                    )}
                  >
                    <SelectValue>{getRoleLabel(coAuthorRole)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRoleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={getRoleColor(coAuthorRole)}>
                  {getRoleLabel(coAuthorRole)}
                </Badge>
              )}
            </>
          )}
          {coauthor.joinedAt && coAuthorRole !== UserRoleOnPromptSet.owner && (
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <LucideCalendarDays className="h-4 w-4" />
              <span>
                {" "}
                Joined on{" "}
                {DateTime.fromISO(coauthor.joinedAt).toFormat("TTT, DD")}
              </span>
            </div>
          )}
        </div>
        {isDeletable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isDisabled}
              >
                {isProcessing ? (
                  <LucideLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LucideMoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                <LucideTrash2 className="h-4 w-4 mr-2" />
                Remove Co-author
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

const getRoleColor = (role: UserRoleOnPromptSet | null) => {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
    case "collaborator":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
    case "reviewer":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
    case "owner":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800";
  }
};

const getRoleLabel = (role: UserRoleOnPromptSet | null) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "collaborator":
      return "Collaborator";
    case "reviewer":
      return "Reviewer";
    case "owner":
      return "Owner";
  }
};
