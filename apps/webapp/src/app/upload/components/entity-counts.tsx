import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import {
  LucideEye,
  LucideLoader2,
  LucideSearch,
  LucideUpload,
} from "lucide-react";
import { forwardRef } from "react";

export interface EntityCountsProps {
  entityName: string;
  icon: React.ComponentType<{ className?: string }>;
  revealCount?: number;
  uploadCount: number;
  foundCount?: number;
  className?: string;
  isLoading?: boolean;
}

export const EntityCounts = forwardRef<HTMLDivElement, EntityCountsProps>(
  (
    {
      entityName,
      icon: Icon,
      revealCount,
      uploadCount,
      foundCount,
      className,
      isLoading = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          className,
          "transition-all duration-200 p-3 rounded-lg flex flex-col gap-2 hover:cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm"
        )}
        {...props}
      >
        <div className="flex flex-col gap-2 items-center">
          <Icon className="w-8 h-8 text-black" />
          <div className="font-semibold text-black">{entityName}</div>
          <div className="flex gap-4">
            {revealCount !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-2 items-center">
                    <LucideEye className="w-4 h-4 text-muted-foreground" />
                    {isLoading ? (
                      <LucideLoader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : (
                      <span className="font-bold">{revealCount}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isLoading ? (
                    "Loading"
                  ) : (
                    <>
                      {revealCount} {entityName} to be revealed
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex gap-2 items-center">
                  <LucideUpload className="w-4 h-4 text-muted-foreground" />
                  {isLoading ? (
                    <LucideLoader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  ) : (
                    <span className="font-bold">{uploadCount}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isLoading ? (
                  "Loading"
                ) : (
                  <>
                    {uploadCount} {entityName} to be uploaded
                  </>
                )}
              </TooltipContent>
            </Tooltip>
            {foundCount !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-2 items-center">
                    <LucideSearch className="w-4 h-4 text-muted-foreground" />
                    {isLoading ? (
                      <LucideLoader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : (
                      <span className="font-bold">{foundCount}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isLoading ? (
                    "Loading"
                  ) : (
                    <>
                      {foundCount} {entityName} found from the file
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  }
);

EntityCounts.displayName = "EntityCounts";
