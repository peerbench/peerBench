import { LucideLoader2 } from "lucide-react";
import { HTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

type LoadingPageProps = HTMLAttributes<HTMLDivElement>;

const LoadingPage = forwardRef<HTMLDivElement, LoadingPageProps>(
  ({ className, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={twMerge(
          "flex h-[calc(100vh-100px)] items-center justify-center dark:bg-gray-950",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center space-y-4">
          <LucideLoader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading</p>
        </div>
      </main>
    );
  }
);

LoadingPage.displayName = "LoadingPage";

export { LoadingPage };
