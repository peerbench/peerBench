"use client";

import { useState } from "react";
import { UserRegistrationChart } from "./user-registration-chart";
import { ActivityCharts } from "./activity-charts";
import { UserStatsTable } from "./user-stats-table";

export function StatsPageClient() {
  const [dateRange, setDateRange] = useState<number>(30);

  return (
    <div className="space-y-8">
      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Date Range:</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>

      {/* User Registration Chart */}
      <UserRegistrationChart days={dateRange} />

      {/* Activity Charts */}
      <ActivityCharts days={dateRange} />

      {/* User Stats Table */}
      <UserStatsTable days={dateRange} />
    </div>
  );
}

