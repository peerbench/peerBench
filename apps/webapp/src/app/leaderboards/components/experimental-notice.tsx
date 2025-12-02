import { FlaskConical, ExternalLink } from "lucide-react";
import Link from "next/link";

const GITHUB_DISCUSSIONS_URL =
  "https://github.com/peerbench/peerBench/discussions";

export function ExperimentalNotice() {
  return (
    <div className="w-full mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Experimental Rankings
          </p>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            These ranking algorithms are a work in progress. We welcome your
            feedback and contributions to improve them!{" "}
            <Link
              href={GITHUB_DISCUSSIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
            >
              Join the discussion on GitHub
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

