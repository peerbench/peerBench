"use client";

import { HTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  message?: string;
}

const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, message, isLoading = true, children, ...props }, ref) => {
    if (!isLoading) return <>{children}</>;

    return (
      <div ref={ref} className={twMerge("relative", className)} {...props}>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-800 dark:border-t-blue-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message || "Loading..."}
            </p>
          </div>
        </div>
        <div className="opacity-50 pointer-events-none">{children}</div>
      </div>
    );
  }
);

LoadingOverlay.displayName = "LoadingOverlay";

export { LoadingOverlay };
