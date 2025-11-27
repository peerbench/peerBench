"use client";

import React, { useEffect } from "react";
import type { SortOption, Filters } from "../types";

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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const handleSortClick = (field: "createdAt" | "updatedAt") => {
    setFilters((prev) => {
      const current = prev.sortBy;
      if (current === `${field}-asc`)
        return { ...prev, sortBy: `${field}-desc` };
      if (current === `${field}-desc`) return { ...prev, sortBy: "" };
      return { ...prev, sortBy: `${field}-asc` };
    });
  };

  const getDirection = (value: SortOption) => value.split("-")[1] ?? "";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
          aria-label="Close filters panel"
        />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 
        transform transition-transform duration-300
        ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 h-full overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Filters</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filter panel"
              className="text-gray-500 hover:text-black text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* SORT */}
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Sort By</h3>
            <div className="flex gap-2">
              {(["createdAt", "updatedAt"] as const).map((field) => {
                const active = filters.sortBy.startsWith(field);
                const dir = getDirection(filters.sortBy as SortOption);

                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleSortClick(field)}
                    className={`px-3 py-2 rounded-lg border flex-1 text-sm transition ${
                      active
                        ? "bg-gray-700 text-white"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {field === "createdAt" ? "Created At" : "Updated At"}
                    {active && (dir === "asc" ? " ↑" : " ↓")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTERS */}
          <div className="space-y-6">
          
            <div>
              <h3 className="font-semibold mb-2">Average Score</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-sm">
                  <span className="mb-1">Min</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="border p-2 rounded-lg"
                    value={filters.avgMin}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, avgMin: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1">Max</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="border p-2 rounded-lg"
                    value={filters.avgMax}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, avgMax: e.target.value }))
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Total Prompts Count</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-sm">
                  <span className="mb-1">Min</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="border p-2 rounded-lg"
                    value={filters.promptsMin}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, promptsMin: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col text-sm">
                  <span className="mb-1">Max</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="border p-2 rounded-lg"
                    value={filters.promptsMax}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, promptsMax: e.target.value }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1" />
          {/* footer buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 h-12 border rounded-lg hover:bg-gray-50 transition"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 h-12 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
