import { PromptStatus, PromptStatuses } from "@/database/types";
import { cn } from "@/utils/cn";
import Link from "next/link";

export interface IncludedByPromptSetLinkProps {
  promptSetId: number;
  promptSetTitle: string;
  promptStatus: PromptStatus;
}

export default function IncludedByPromptSetLink({
  promptSetId,
  promptSetTitle,
  promptStatus,
}: IncludedByPromptSetLinkProps) {
  return (
    <Link
      className={cn(
        "text-[gray-600 text-xs hover:text-gray-800 transition-colors duration-200 hover:underline",
        {
          "text-red-600 font-bold": promptStatus !== PromptStatuses.included,
        }
      )}
      href={`/prompt-sets/view/${promptSetId}`}
    >
      {promptSetTitle} ({promptSetId})
    </Link>
  );
}
