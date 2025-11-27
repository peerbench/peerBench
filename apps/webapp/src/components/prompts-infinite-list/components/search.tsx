"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useComponentContext } from "../context";

export function Search() {
  const { search, setSearch } = useComponentContext();
  const [value, setValue] = useState(search);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setSearch(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearch(value);
    }
  };

  useEffect(() => {
    setValue(search);
  }, [search]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">Text Search</label>
      </div>
      <Input
        type="text"
        placeholder="Enter Prompt ID or search for question, answer etc..."
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  );
}
