import {
  LucideClock,
  LucideCalendar,
  LucideTag,
  LucideEye,
  LucidePen,
  LucideUsers,
  LucideBarChart3,
  LucideLock,
  LucideFileText,
  LucidePackageOpen,
} from "lucide-react";
import { MarkdownTruncatedText } from "@/components/markdown-truncated-text";
import Link from "next/link";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/utils/format-number";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PromptSetItem } from "@/lib/hooks/use-prompt-set-api";

const MAX_TAGS_TO_SHOW = 5;

export function PromptSetCard({ item }: { item: PromptSetItem }) {
  return (
    <div
      className={`group border rounded-lg p-6 hover:shadow-md transition-all duration-300 bg-card ${
        !item.isPublic
          ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20"
          : "border-border"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-3">
            {/* Title */}
            <div className="flex items-center gap-2">
              <Link
                href={`/prompt-sets/view/${item.id}`}
                className="text-lg font-bold text-card-foreground line-clamp-1 hover:text-primary hover:underline transition-colors duration-200 "
              >
                {item.title}
              </Link>
              <div className="text-xs bg-muted text-muted-foreground rounded-md p-1 cursor-help">
                ID: {item.id}
              </div>
              {item.isPublic ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-md text-xs cursor-help">
                      <LucideEye className="w-3 h-3" />
                      <span className="font-medium">Public</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    This Benchmark is public and visible to everyone.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-md px-2 py-1 cursor-help">
                      <LucideLock className="w-3 h-3" />
                      <span className="font-medium">Private</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    This Benchmark is protected and only visible to the
                    authorized users.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Description */}
            <div className="mb-2">
              <MarkdownTruncatedText
                text={item.description}
                maxLength={200}
                className="text-sm text-muted-foreground"
              />
            </div>

            {/* Citation Info */}
            {item.citationInfo && (
              <div className="mb-3">
                <div className="flex items-start gap-2">
                  <LucideFileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 block">
                      Citation Info:
                    </span>
                    <MarkdownTruncatedText
                      text={item.citationInfo}
                      maxLength={150}
                      className="text-xs text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap gap-2">
              {item.category && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded-md cursor-help">
                      <LucideTag className="w-3 h-3" />
                      <span>{item.category}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Category: {item.category}</TooltipContent>
                </Tooltip>
              )}

              {item.totalPromptsCount !== undefined && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-1 rounded-md text-xs cursor-help">
                      <span className="font-medium">
                        {formatNumber(item.totalPromptsCount)} Prompts
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Total number of Prompts: {item.totalPromptsCount}
                  </TooltipContent>
                </Tooltip>
              )}

              {item.totalContributors !== undefined &&
                item.totalContributors > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-md text-xs cursor-help">
                        <LucideUsers className="w-3 h-3" />
                        <span className="font-medium">
                          {formatNumber(item.totalContributors)} Contributors
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Number of users who have contributed to this Benchmark
                    </TooltipContent>
                  </Tooltip>
                )}

              {item.overallAvgScore !== undefined &&
                item.totalScoreCount !== undefined &&
                item.totalScoreCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded-md text-xs cursor-help">
                        <LucideBarChart3 className="w-3 h-3" />
                        <span className="font-medium">
                          Avg Score: {(item.overallAvgScore * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Average score of {item.totalScoreCount} different scores
                      that were given to the Responses of the Prompts from this
                      Benchmark
                    </TooltipContent>
                  </Tooltip>
                )}
              {item.isPublicSubmissionsAllowed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-cyan-600 bg-cyan-100 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-1 rounded-md text-xs cursor-help">
                      <LucidePackageOpen className="w-3 h-3" />
                      <span className="font-medium">
                        Public Submissions Allowed
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Anyone can submit Prompts to this Benchmark</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Dates and Tags */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {item.createdAt && (
                <div className="flex items-center gap-1.5">
                  <LucideCalendar className="w-3 h-3" />
                  <span className="font-medium">
                    Created {DateTime.fromISO(item.createdAt).toRelative()}
                  </span>
                </div>
              )}
              {item.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <LucideClock className="w-3 h-3" />
                  <span className="font-medium">
                    Updated {DateTime.fromISO(item.updatedAt).toRelative()}
                  </span>
                </div>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <LucideTag className="w-3 h-3" />
                  <span className="font-medium">
                    Tags: {item.tags.slice(0, MAX_TAGS_TO_SHOW).join(", ")}
                    {item.tags.length > MAX_TAGS_TO_SHOW &&
                      ` and ${item.tags.length - MAX_TAGS_TO_SHOW} more`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action area */}
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/prompt-sets/view/${item.id}`}>
              <LucideEye size={16} />
              <span>View</span>
            </Link>
          </Button>
          {item.permissions?.canEdit && (
            <Button asChild variant="outline">
              <Link href={`/prompt-sets/view/${item.id}/edit`}>
                <LucidePen size={16} />
                <span>Edit</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
