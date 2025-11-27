"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PromptSetLicenses } from "@/database/types";
import { useComponentContext } from "../context";
import { TagsMultiSelect } from "./tags-multi-select";
import { CategorySelect } from "./category-select";
import { cn } from "@/utils/cn";
import { LucideInfo } from "lucide-react";
import { motion } from "motion/react";

const licenseOptions = [
  {
    value: PromptSetLicenses.ccBy40,
    label: "CC BY 4.0 (Open)",
    description:
      "Creative Commons Attribution 4.0 International License. Allows sharing, remixing, and reuse for any purpose, provided proper attribution is given.",
  },
  {
    value: PromptSetLicenses.odbl,
    label: "Open Database License (Open)",
    description:
      "Open Database License. Permits use, modification, and sharing of databases with attribution and share-alike requirements.",
  },
  {
    value: PromptSetLicenses.cdlaPermissive20,
    label: "Community Data License Agreement Permissive 2.0 (Open)",
    description:
      "Community Data License Agreement Permissive 2.0. A permissive license that allows free use, modification, and distribution of data with attribution.",
  },
  {
    value: PromptSetLicenses.cuda,
    label: "CUDA (Restricted)",
    description:
      "Custom data license with usage restrictions. Typically limits redistribution or commercial use unless explicitly permitted by the licensor.",
  },
  {
    value: PromptSetLicenses.fairNoncommercialResearchLicense,
    label: "Fair Noncommercial Research License (Private)",
    description:
      "License allowing use for research and educational purposes only. Commercial use requires separate permission.",
  },
];

export function InformationSection() {
  const { register, errors, watch, setValue, isSubmitting } =
    useComponentContext();
  const selectedLicense = watch("license");
  const selectedLicenseOption = licenseOptions.find(
    (option) => option.value === selectedLicense
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> Title (Required)
          </label>
          <Input
            id="title"
            {...register("title")}
            disabled={isSubmitting}
            placeholder="Enter benchmark title"
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Description (Optional)
          </label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Enter benchmark description"
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        {/* Citation Info */}
        <div className="space-y-2">
          <label
            htmlFor="citationInfo"
            className="text-sm font-medium text-gray-700"
          >
            Citation Info (Optional)
          </label>
          <Textarea
            id="citationInfo"
            {...register("citationInfo")}
            placeholder="Enter citation information"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Category and Tags Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div className="space-y-2">
            <label
              htmlFor="category"
              className="text-sm font-medium text-gray-700"
            >
              Category (Optional)
            </label>
            <CategorySelect
              value={watch("category") || null}
              onChange={(category) => setValue("category", category)}
              error={errors.category?.message}
              placeholder="Search and select category..."
              disabled={isSubmitting}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium text-gray-700">
              Tags (Optional)
            </label>
            <TagsMultiSelect
              value={(watch("tags") || []) as string[]}
              onChange={(tags) => setValue("tags", tags)}
              error={errors.tags?.message}
              placeholder="Search and select tags..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* License Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="license"
              className="text-sm font-medium text-gray-700"
            >
              <span className="text-red-500">*</span> License (Required)
            </label>
            <Select
              value={watch("license")}
              onValueChange={(value) => setValue("license", value as any)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                className={cn("w-full", {
                  "border-red-500": errors.license,
                })}
              >
                <SelectValue placeholder="Select a license" />
              </SelectTrigger>
              <SelectContent>
                {licenseOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.license && (
              <p className="text-sm text-red-500">{errors.license.message}</p>
            )}
          </div>

          {selectedLicenseOption && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-box border border-box-border rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <LucideInfo
                  size={16}
                  className="text-box-muted mt-0.5 flex-shrink-0"
                />
                <div>
                  <div className="text-box-title font-medium">
                    License Explanation
                  </div>
                  <p className="text-sm text-box-foreground">
                    {selectedLicenseOption.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
