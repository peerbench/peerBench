"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LucideFunnel } from "lucide-react";
// import { useSearchParams } from "next/navigation";
import PromptSearchFilters from "@/components/prompt-search-filters";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";

export default function Filters() {
  const [isExtrasEnabled] = useSettingExtra();
  // const searchParams = useSearchParams();

  if (!isExtrasEnabled) {
    return null;
  }

  return (
    <Accordion
      type="single"
      collapsible
      /* defaultValue={searchParams.size > 0 ? "filters" : undefined} */
    >
      <AccordionItem value="filters" className="bg-white group shadow-xs">
        <AccordionTrigger className="pl-3 p-2">
          <div className="flex items-center gap-2">
            <LucideFunnel size={16} />
            Advanced Filters
          </div>
        </AccordionTrigger>
        <AccordionContent
          className="group-data-[state=closed]:hidden p-5 border-t border-t-gray-200"
          forceMount
        >
          <PromptSearchFilters />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
