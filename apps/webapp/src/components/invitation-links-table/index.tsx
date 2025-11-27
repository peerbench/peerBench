"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "../pagination";
import { useState, useEffect, useCallback } from "react";
import InvitationLinksTableRow from "./row";
import { LucideLoader2, LucideLink, LucidePlus } from "lucide-react";
import { UserRoleOnPromptSet } from "@/database/types";
import { motion } from "motion/react";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { reactSelectStyles } from "@/lib/styles/react-select-styles";
import { DateTime } from "luxon";
import { roleOptions } from "@/lib/options";
import Select from "react-select";
import {
  InvitationItem,
  usePromptSetAPI,
} from "@/lib/hooks/use-prompt-set-api";

interface InvitationLinksTableProps {
  promptSetId: number;
  isPromptSetPublic?: boolean;
  hasUserEditPermission?: boolean;
}

type RoleOption = {
  value: UserRoleOnPromptSet;
  label: string;
  description: string;
};

export function InvitationLinksTable({
  promptSetId,
  hasUserEditPermission,
  isPromptSetPublic,
}: InvitationLinksTableProps) {
  const promptSetAPI = usePromptSetAPI();
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [excludeRevoked, setExcludeRevoked] = useState(true);
  const [excludeUsed, setExcludeUsed] = useState(true);
  const [isReusable, setIsReusable] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await promptSetAPI.getInvitations(promptSetId, {
        page: currentPage,
        pageSize: pageSize,
        excludeRevokedInvitations: excludeRevoked,
        excludeUsedInvitations: excludeUsed,
      });
      setInvitations(response.data);
      setTotalCount(response.pagination.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch invitations"
      );
    } finally {
      setLoading(false);
    }
  }, [
    promptSetAPI,
    promptSetId,
    currentPage,
    pageSize,
    excludeRevoked,
    excludeUsed,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleCreateInvite = async () => {
    if (!selectedRole) {
      return;
    }

    setIsCreating(true);
    try {
      const code = await promptSetAPI
        .createInvitationCode({
          promptSetId,
          role: selectedRole.value,
          isReusable,
        })
        .then((r) => r.code);

      // Add the new invitation to the list
      const newInvitation: InvitationItem = {
        code,
        role: selectedRole.value,
        createdAt: DateTime.now().toISO()!,
        usedAt: null,
        revokedAt: null,
        createdBy: "", // This would need to be provided by the API
        isReusable,
      };

      setInvitations((prev) => [newInvitation, ...prev]);
      setTotalCount((prev) => prev + 1);
      setSelectedRole(null);
      setShowCreateForm(false);
      setIsReusable(false);
      toast.success("Invitation link created successfully");
    } catch (error) {
      console.error(error);
      toast.error(`Failed to create invitation link: ${errorMessage(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeInvite = async (code: string) => {
    try {
      await promptSetAPI.revokeInvitation({ code });
      setInvitations((prev) =>
        prev.map((invite) =>
          invite.code === code
            ? { ...invite, revokedAt: DateTime.now().toISO()! }
            : invite
        )
      );
      toast.success("Invitation revoked successfully");
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error));
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const filteredRoleOptions = isPromptSetPublic
    ? roleOptions.filter((option) => option.value === UserRoleOnPromptSet.admin)
    : roleOptions;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LucideLink className="h-5 w-5" />
            Invitation Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LucideLoader2 className="animate-spin" size={24} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LucideLink className="h-5 w-5" />
            Invitation Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <LucideLink className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={fetchInvitations} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LucideLink className="h-5 w-5" />
            Invitation Links
          </CardTitle>
          {hasUserEditPermission && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="outline"
              size="sm"
            >
              <LucidePlus className="h-4 w-4 mr-2" />
              Create Invitation
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude-revoked"
              checked={excludeRevoked}
              onCheckedChange={(checked) =>
                setExcludeRevoked(checked as boolean)
              }
            />
            <label
              htmlFor="exclude-revoked"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Exclude revoked invitations
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude-used"
              checked={excludeUsed}
              onCheckedChange={(checked) => setExcludeUsed(checked as boolean)}
            />
            <label
              htmlFor="exclude-used"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Exclude used invitations
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Create Invitation Form */}
          {showCreateForm && hasUserEditPermission && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Role
                  </label>
                  <Select
                    value={selectedRole}
                    onChange={setSelectedRole}
                    options={filteredRoleOptions}
                    placeholder="Select role..."
                    styles={reactSelectStyles}
                    isSearchable={false}
                    isDisabled={isCreating}
                  />
                </div>

                {selectedRole && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        Role: {selectedRole.label}
                      </div>
                      <div className="text-blue-700 dark:text-blue-300 mt-1">
                        {selectedRole.description}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-reusable"
                    checked={isReusable}
                    onCheckedChange={(checked) =>
                      setIsReusable(checked as boolean)
                    }
                    disabled={isCreating}
                  />
                  <label
                    htmlFor="is-reusable"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Make invitation reusable
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateInvite}
                    disabled={!selectedRole || isCreating}
                    size="sm"
                  >
                    {isCreating ? (
                      <>
                        <LucideLoader2 className="animate-spin h-4 w-4 mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Invitation"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedRole(null);
                      setIsReusable(false);
                    }}
                    variant="outline"
                    size="sm"
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Invitations List */}
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <LucideLink className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No invitation links found</p>
              {hasUserEditPermission && (
                <p className="text-sm mt-2">
                  Create your first invitation link to invite collaborators
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <InvitationLinksTableRow
                    key={invitation.code}
                    invitation={invitation}
                    hasUserEditPermission={hasUserEditPermission}
                    onRevoke={handleRevokeInvite}
                    promptSetId={promptSetId}
                  />
                ))}
              </div>

              {totalCount > pageSize && (
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItemCount={totalCount}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  sizeOptions={[5, 10, 20, 50]}
                />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
