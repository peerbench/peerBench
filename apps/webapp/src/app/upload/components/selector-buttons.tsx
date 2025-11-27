"use client";

import { Button } from "@/components/ui/button";
import { LucideEye, LucideEyeOff, LucideUpload, LucideX } from "lucide-react";
import { usePageContext, EntityType, EntityState } from "../context";
import { Dispatch, SetStateAction } from "react";

export interface SelectorButtonsProps {
  entityType: EntityType;
  disabled?: boolean;
}

export function SelectorButtons({
  entityType,
  disabled = false,
}: SelectorButtonsProps) {
  const ctx = usePageContext();
  const setState = (
    entityType === "prompts" ? ctx.setPrompts : ctx.setResponses
  ) as Dispatch<SetStateAction<EntityState[]>>;

  const handleMarkAllReveal = () => {
    setState((prev: EntityState[]) =>
      prev.map((item: EntityState) => {
        // Don't update entities that are already revealed
        if (item.isRevealed === true) {
          return item;
        }

        return {
          ...item,
          upload: item.isRegistered === true ? item.upload : true,
          reveal: true,
        };
      })
    );
  };

  const handleMarkAllNotReveal = () => {
    setState((prev: EntityState[]) =>
      prev.map((item: EntityState) => {
        // Don't update entities that are already revealed
        if (item.isRevealed === true) {
          return item;
        }
        return {
          ...item,
          reveal: false,
        };
      })
    );
  };

  const handleMarkAllUpload = () => {
    setState((prev: EntityState[]) =>
      prev.map((item: EntityState) => {
        if (item.isRegistered === true) {
          return item;
        }
        return {
          ...item,
          upload: true,
        };
      })
    );
  };

  const handleMarkAllNotUpload = () => {
    setState((prev: EntityState[]) =>
      prev.map((item: EntityState) => {
        // Don't update entities that are already registered and revealed
        if (item.isRegistered === true && item.isRevealed === true) {
          return item;
        }
        return {
          ...item,
          upload: false,
          reveal: false,
        };
      })
    );
  };

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleMarkAllReveal}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <LucideEye className="w-4 h-4" />
        Reveal all
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleMarkAllNotReveal}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <LucideEyeOff className="w-4 h-4" />
        Hide all
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleMarkAllUpload}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <LucideUpload className="w-4 h-4" />
        Upload all
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleMarkAllNotUpload}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <LucideX className="w-4 h-4" />
        Unmark all
      </Button>
    </div>
  );
}
