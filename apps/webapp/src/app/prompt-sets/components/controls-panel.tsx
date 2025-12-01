"use client";
import React, { useEffect } from "react";
import type { Filters, SortOption } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ControlsPanelProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
  onReset: () => void;
}

export default function ControlsPanel({
  open,
  onClose,
  filters,
  setFilters,
  onApply,
  onReset,
}: ControlsPanelProps) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSortClick = (field: "createdAt" | "updatedAt") => {
    setFilters((prev) => {
      const cur = prev.sortBy ?? "";
      if (cur === `${field}-asc`) return { ...prev, sortBy: `${field}-desc` };
      if (cur === `${field}-desc`) return { ...prev, sortBy: "" };
      return { ...prev, sortBy: `${field}-asc` };
    });
  };

  const getDirection = (value: SortOption) => {
    if (!value.includes("-")) return "";
    return value.split("-")[1] ?? "";
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-label="Close filters panel"
      />

      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 p-6 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Filters</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Sort By</h3>
          <div className="flex gap-2">
            {(["createdAt", "updatedAt"] as const).map((field) => {
             
              const active = filters.sortBy !== "" && filters.sortBy.startsWith(field);
              const dir = getDirection(filters.sortBy as SortOption);
              return (
                <Button
                  key={field}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleSortClick(field)}
                >
                  {field === "createdAt" ? "Created At" : "Updated At"}
                  {active &&
                    (dir === "asc" ? " ↑" : dir === "desc" ? " ↓" : "")}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Average Score</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={filters.avgMin ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, avgMin: Number(e.target.value) }))
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.avgMax ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, avgMax: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Total Prompts</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={filters.promptsMin ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, promptsMin: Number(e.target.value) }))
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.promptsMax ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, promptsMax: Number(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onReset}>
            Reset
          </Button>
          <Button variant="default" className="flex-1" onClick={onApply}>
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}
