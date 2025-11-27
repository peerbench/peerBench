import { UserRoleOnPromptSet } from "@/database/types";
import { Badge } from "@/components/ui/badge";
import { LucideUser, LucideHash, LucideBuilding2 } from "lucide-react";
import Link from "next/link";
import { capitalize } from "@/utils/capitalize";

export type CollaboratorsTableRowProps = {
  userId: string;
  displayName: string;
  role: UserRoleOnPromptSet | null;
  orgName?: string | null;
  joinedAt?: string | null;
};

export function CollaboratorsTableRow({
  userId,
  displayName,
  role,
  orgName,
}: CollaboratorsTableRowProps) {
  return (
    <div className="pl-6 text-lg text-slate-600 dark:text-slate-400 break-all border-b hover:opacity-75 duration-100 [&:last-child]:border-b-0">
      <div className="py-3">
        <Link href={`/profile/${userId}`}>
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1 flex-wrap">
            <p>{displayName}</p>
            {
              <Badge
                variant="secondary"
                className={`flex items-center gap-1 ${getRoleColor(role)}`}
              >
                <LucideUser className="h-3 w-3" />
                {role ? capitalize(role) : "Contributor"}
              </Badge>
            }
            {orgName && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400"
              >
                <LucideBuilding2 className="h-3 w-3" />
                {orgName}
              </Badge>
            )}
          </div>
          <p className="text-sm flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <LucideHash className="w-4 h-4" />
            {userId}
          </p>
        </Link>
      </div>
    </div>
  );
}

const getRoleColor = (role: UserRoleOnPromptSet | null) => {
  switch (role) {
    case UserRoleOnPromptSet.owner:
      return "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400";
    case UserRoleOnPromptSet.admin:
      return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400";
    case UserRoleOnPromptSet.collaborator:
      return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400";
    case UserRoleOnPromptSet.reviewer:
      return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400";

    // Contributor
    default:
      return "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400";
  }
};
