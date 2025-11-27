"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useComponentContext } from "../context";

export function SelectVisibilitySection() {
  const { watch, setValue, isSubmitting } = useComponentContext();
  const isPublic = watch("isPublic");
  const isPublicSubmissions = watch("isPublicSubmissionsAllowed");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visibility & Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Public Visibility */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              disabled={isSubmitting}
              onCheckedChange={(checked) => {
                setValue("isPublic", !!checked);
                setValue(
                  "isPublicSubmissionsAllowed",
                  !!!checked ? false : isPublicSubmissions
                );
              }}
            />
            <label
              htmlFor="isPublic"
              className="text-sm font-medium text-foreground hover:cursor-pointer"
            >
              Public Visibility
            </label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            If the benchmark has public visibility then its details,
            including all prompts are visible to all viewers on Peerbench
            and everybody can run the benchmark. If the visibility
            is not public then only co-authors can see and run
            the benchmark.
          </p>
        </div>

        {/* Public Submissions */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="isPublicSubmissions"
              checked={isPublicSubmissions}
              disabled={!isPublic || isSubmitting}
              onCheckedChange={(checked) =>
                setValue("isPublicSubmissionsAllowed", !!checked)
              }
            />
            <label
              htmlFor="isPublicSubmissions"
              className="text-sm font-medium text-foreground hover:cursor-pointer"
            >
              Public Submissions
            </label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            If a public benchmark has public submissions then every user on
            Peerbench can contribute results, data and reviews. If not, only
            co-authors with Collaborator role or higher can contribute results,
            data and reviews, while Reviewers can contribute reviews.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
