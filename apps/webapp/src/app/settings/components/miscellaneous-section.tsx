"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LucideSettings } from "lucide-react";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";

export function MiscellaneousSection() {
  const [extraEnabled, setExtraEnabled] = useSettingExtra();

  const handleExtraChange = (checked: boolean) => {
    setExtraEnabled(checked);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LucideSettings className="h-5 w-5" />
          Miscellaneous
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="extra-enabled"
                checked={extraEnabled}
                onCheckedChange={handleExtraChange}
                className="mt-1"
              />
              <div className="space-y-2">
                <label
                  htmlFor="extra-enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Enable Extras
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Enables the extra/advanced features.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
