import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AgentNameProps {
  name: string;
  provider?: string | null;
  endpointUrl?: string | null;
  description?: string | null;
  className?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3";
  children?: React.ReactNode;
  wrapInTooltip?: boolean;
}

function buildTooltipContent(
  provider?: string | null,
  endpointUrl?: string | null,
  description?: string | null
): string | null {
  const parts: string[] = [];

  if (provider && endpointUrl) {
    parts.push(`Provider: ${provider}`);
    parts.push(`Endpoint: ${endpointUrl}`);
  } else if (provider) {
    parts.push(`Provider: ${provider}`);
  } else if (endpointUrl) {
    parts.push(`Endpoint: ${endpointUrl}`);
  }

  if (description) {
    parts.push(`Description: ${description}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

export function AgentName({
  name,
  provider,
  endpointUrl,
  description,
  className,
  as: Component = "span",
  children,
  wrapInTooltip = true,
}: AgentNameProps) {
  const tooltipContent = buildTooltipContent(
    provider,
    endpointUrl,
    description
  );
  const hasTooltip = tooltipContent !== null && wrapInTooltip;

  const content = (
    <div className="flex flex-col">
      <Component className={cn("inline-flex items-center", className)}>
        {children || name}
        {hasTooltip && (
          <Info className="inline-block w-3.5 h-3.5 ml-1.5 text-gray-400 shrink-0" />
        )}
      </Component>
      {endpointUrl && (
        <span className="text-xs text-muted-foreground">{endpointUrl}</span>
      )}
    </div>
  );

  if (!hasTooltip) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">{tooltipContent}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
