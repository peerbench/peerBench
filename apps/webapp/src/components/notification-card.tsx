"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideBell, LucideMessageSquare } from "lucide-react";
import { DateTime } from "luxon";
import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { NotificationType, NotificationTypes } from "@/database/types";
import { normalizeDate } from "@/utils/normalize-date";

const notificationCardVariants = cva(
  "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
        compact: "border-l-2",
        read: "",
      },
    },
    defaultVariants: {
      variant: "read",
    },
  }
);

export interface NotificationCardProps extends VariantProps<
  typeof notificationCardVariants
> {
  type: NotificationType;
  metadata: Record<string, any>;
  content: string;
  readAt: string | Date | null;
  createdAt: string | Date;
  variant?: "default" | "compact" | "read";
  className?: string;
  onClick?: () => void;
  onHover?: () => void;
}

export function NotificationCard({
  type,
  content,
  readAt,
  createdAt,
  variant,
  className,
  onClick,
  onHover,
}: NotificationCardProps) {
  const timeAgo = DateTime.fromJSDate(
    normalizeDate(createdAt, "date")
  ).toRelative();
  const isRead = readAt !== null;

  // Determine variant based on read status if not explicitly provided
  const cardVariant = variant || (isRead ? "read" : "default");
  const isCompact = variant === "compact";

  const title = getNotificationTitle(type);

  return (
    <Card
      className={cn(
        notificationCardVariants({
          variant: isCompact ? "compact" : cardVariant,
        }),
        !isRead &&
          !isCompact &&
          "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
        !isRead && isCompact && "border-l-2 border-l-blue-500",
        className
      )}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      <CardContent
        className={cn("bg-white rounded-lg", isCompact ? "p-3" : "p-4")}
      >
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5", isCompact && "mt-0")}>
            <NotificationIcon
              type={type}
              size={isCompact ? "compact" : "default"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4
                    className={cn(
                      "font-semibold text-gray-900 dark:text-gray-100",
                      isCompact ? "text-xs" : "text-sm"
                    )}
                  >
                    {title}
                  </h4>
                  {!isRead && (
                    <Badge
                      variant="default"
                      className="h-2 w-2 p-0 rounded-full shrink-0"
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "text-gray-600 dark:text-gray-400",
                    isCompact ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
                  )}
                >
                  {content}
                </div>
              </div>
              <div
                className={cn(
                  "text-gray-500 whitespace-nowrap shrink-0",
                  isCompact ? "text-xs" : "text-xs"
                )}
              >
                {timeAgo}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationIcon({
  type,
  size = "default",
}: {
  type: NotificationType;
  size?: "default" | "compact";
}) {
  const iconSize = size === "compact" ? "w-4 h-4" : "w-5 h-5";

  switch (type) {
    case NotificationTypes.promptComment:
      return <LucideMessageSquare className={cn(iconSize, "text-blue-600")} />;
    default:
      return <LucideBell className={cn(iconSize, "text-gray-600")} />;
  }
}

function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case NotificationTypes.promptComment:
      return "New comment";
    default:
      return "Notification";
  }
}
