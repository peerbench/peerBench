"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface EntityPreviewProps<T> {
  items: T[];
  title: string;
  itemName: string; // e.g., "prompts", "responses", "scores"
  isLoading?: boolean;
  collapsible?: boolean;
  renderContent: (props: {
    isLoading: boolean;
    items: T[];
    currentIndex: number;
    onPrevious: () => void;
    onNext: () => void;
    [key: string]: any; // Allow additional props to be passed through
  }) => ReactNode;
  contentProps?: Record<string, any>; // Additional props to pass to renderContent
  renderHeader?: (item: T, index: number) => ReactNode;
  renderFooter?: (item: T, index: number) => ReactNode;
}

export function EntityPreview<T>({
  items,
  title,
  itemName,
  isLoading = false,
  collapsible = true,
  renderContent,
  contentProps = {},
  renderHeader,
  renderFooter,
}: EntityPreviewProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [items.length]);

  const handleNext = () => {
    if (items.length === 0) return;
    const safeIndex = Math.min(currentIndex, Math.max(0, items.length - 1));
    if (safeIndex === items.length - 1) {
      // Wrap around to first item
      setCurrentIndex(0);
    } else {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (items.length === 0) return;
    const safeIndex = Math.min(currentIndex, Math.max(0, items.length - 1));
    if (safeIndex === 0) {
      // Wrap around to last item
      setCurrentIndex(items.length - 1);
    } else {
      setCurrentIndex(safeIndex - 1);
    }
  };

  // Get current item for render functions
  const currentItem = items[currentIndex];
  const customHeader =
    renderHeader && currentItem
      ? renderHeader(currentItem, currentIndex)
      : null;
  const customFooter =
    renderFooter && currentItem
      ? renderFooter(currentItem, currentIndex)
      : null;

  return (
    <div
      className={`border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
    >
      {collapsible !== false ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="preview" className="border-none">
            <AccordionTrigger className="w-full flex justify-between items-center text-left group hover:cursor-pointer">
              <div className="w-full flex justify-between items-center text-left">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {title}
                </h3>
                <div className="flex items-center space-x-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        Loading...
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {items.length} {itemName}
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden">
              {customHeader}
              {renderContent({
                isLoading,
                items,
                currentIndex,
                onPrevious: handlePrevious,
                onNext: handleNext,
                ...contentProps,
              })}
              {customFooter}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <div className="space-y-4">
          {customHeader}
          {renderContent({
            isLoading,
            items,
            currentIndex,
            onPrevious: handlePrevious,
            onNext: handleNext,
            ...contentProps,
          })}
          {customFooter}
        </div>
      )}
    </div>
  );
}
