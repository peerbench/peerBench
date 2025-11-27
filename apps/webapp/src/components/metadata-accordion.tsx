import { LucideInfo } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { AccordionContent } from "@radix-ui/react-accordion";
import { JSONView } from "./json-view";

export interface MetadataAccordionProps {
  title?: string;
  metadata: Record<string, any>;
}

export function MetadataAccordion({ metadata, title }: MetadataAccordionProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="metadata">
        <AccordionTrigger className="pl-4 pt-4 pb-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <LucideInfo size={16} />
            {title ?? "More Details"}
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-5 bg-card-content-container">
          <JSONView data={metadata} collapsed={true} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
