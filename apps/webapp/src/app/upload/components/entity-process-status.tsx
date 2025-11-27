import {
  LucideAlertCircle,
  LucideCheckCircle2,
  LucideLoader2,
  LucideEye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type EntityProcessStatusProps = {
  isRevealed?: boolean;
  isRegistered?: boolean;
};

export function EntityProcessStatus({
  isRevealed,
  isRegistered,
}: EntityProcessStatusProps) {
  const revealed = isRevealed === true;
  const registered = isRegistered === true;

  let Icon: React.ComponentType<{
    className?: string;
  }>;
  let message: string;
  let iconClasses: string;
  let textClasses: string;
  let tooltipContent: React.ReactNode;

  if (isRevealed === undefined && isRegistered === undefined) {
    Icon = LucideLoader2;
    message = "Checking status...";
    iconClasses = "text-muted-foreground animate-spin";
    textClasses = "text-muted-foreground";
    tooltipContent = "Please wait";
  } else if (revealed && registered) {
    Icon = LucideAlertCircle;
    message = "It is already uploaded and revealed";
    iconClasses = "text-red-500 dark:text-red-400";
    textClasses = "text-red-600 dark:text-red-400";
    tooltipContent = " The Prompt is already registered and revealed";
  } else if (registered && !revealed) {
    Icon = LucideEye;
    message = "It can be revealed";
    iconClasses = "text-amber-500 dark:text-amber-400";
    textClasses = "text-amber-600 dark:text-amber-400";
    tooltipContent = "The Prompt is already registered but not revealed yet.";
  } else {
    Icon = LucideCheckCircle2;
    message = "It can be uploaded and revealed";
    iconClasses = "text-emerald-500 dark:text-emerald-400";
    textClasses = "text-emerald-600 dark:text-emerald-400";
    tooltipContent = "The Prompt is not registered yet";
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconClasses}`} />
          <span className={`text-sm font-medium ${textClasses}`}>
            {message}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
}
