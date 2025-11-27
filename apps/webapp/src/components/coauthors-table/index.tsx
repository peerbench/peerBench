"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "../pagination";
import { useState } from "react";
import { LucideUser } from "lucide-react";
import { CoauthorsTableSkeleton } from "./skeleton";
import { useCoauthors } from "@/lib/react-query/use-coauthors";
import { errorMessage } from "@/utils/error-message";
import CoauthorsTableRow from "./row";

export interface CoauthorsTableProps {
  promptSetId: number;
  isPromptSetPublic?: boolean;
  hasUserEditPermission?: boolean;
  hasUserRemovePermission?: boolean;
  allowEdit?: boolean;
}

export function CoauthorsTable({
  promptSetId,
  isPromptSetPublic,
  hasUserEditPermission,
  hasUserRemovePermission,
  allowEdit = true,
}: CoauthorsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const {
    data: pageData,
    isLoading,
    error,
    refetch,
  } = useCoauthors(promptSetId, {
    pageSize,
    page: currentPage,

    // This table only shows the "collaborators", not "contributors"
    excludePublicCollaborators: true,
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  if (isLoading) {
    return <CoauthorsTableSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LucideUser className="h-5 w-5" />
            Co-authors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <LucideUser className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">{errorMessage(error)}</p>
            </div>
            <Button onClick={() => refetch()} variant="outline">
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
        <CardTitle className="flex items-center gap-2">
          <LucideUser className="h-5 w-5" />
          Co-authors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pageData?.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <LucideUser className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No co-authors found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {pageData?.data.map((coauthor) => (
                  <CoauthorsTableRow
                    key={coauthor.userId}
                    coauthor={coauthor}
                    promptSetId={promptSetId}
                    hasUserEditPermission={
                      allowEdit === true ? hasUserEditPermission : false
                    }
                    hasUserRemovePermission={
                      allowEdit === true ? hasUserRemovePermission : false
                    }
                    isPromptSetPublic={isPromptSetPublic}
                  />
                ))}
              </div>

              {(pageData?.pagination.totalCount ?? 0) > pageSize && (
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItemCount={pageData?.pagination.totalCount ?? 0}
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
