import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SectionsSkeleton() {
  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between text-sm font-normal text-gray-500">
              <div className="flex flex-col gap-3">
                {/* Prompt ID Link Skeleton */}
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-3" />
                </div>
                {/* Included in Prompt Sets Skeleton */}
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Type Badge Skeleton */}
                <Skeleton className="h-6 w-20" />
                {/* Date Badge Skeleton */}
                <Skeleton className="h-6 w-24" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tested on Section Skeleton */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <div className="flex w-full flex-wrap gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid gap-3 grid-cols-2">
              {/* Prompt Section Skeleton */}
              <div className="col-span-1">
                <Skeleton className="h-6 w-16 mb-3" />
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>

              {/* Answer Section Skeleton */}
              <div className="col-span-1">
                <Skeleton className="h-6 w-24 mb-3" />
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>

            {/* Metadata Accordion Skeleton */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="metadata">
                <AccordionTrigger className="pl-5 py-3 text-md text-foreground">
                  <Skeleton className="h-5 w-20" />
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="bg-gray-50 p-4 border">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="text-lg font-medium">
          <Skeleton className="h-6 w-16" />
        </CardHeader>
        <CardContent>
          {/* Review Stats Skeleton */}
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Opinion Selection Skeleton */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Skeleton className="flex-1 h-16" />
                <Skeleton className="flex-1 h-16" />
              </div>
            </div>

            {/* Comment Accordion Skeleton */}
            <div className="w-full">
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex gap-2 justify-end">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
