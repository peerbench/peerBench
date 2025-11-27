"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type UserRegistrationData = {
  dailyStats: {
    date: string;
    users_with_org: number;
    users_without_org: number;
    total_users: number;
    cumulative_total: number;
  }[];
  totalUsers: number;
};

export function UserRegistrationChart({ days }: { days: number }) {
  const [data, setData] = useState<UserRegistrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v2/stats/user-registrations?days=${days}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [days]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">User Registrations</h2>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">User Registrations</h2>
        <div className="h-96 flex items-center justify-center">
          <p className="text-red-500">Error: {error || "No data available"}</p>
        </div>
      </div>
    );
  }

  // Format data for the chart
  const chartData = data.dailyStats.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    "With University Affiliation": stat.users_with_org,
    "Without University Affiliation": stat.users_without_org,
    "Cumulative Total": stat.cumulative_total,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">User Registrations</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {data.totalUsers}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            total users
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: "currentColor" }}
          />
          <YAxis 
            yAxisId="left"
            className="text-xs" 
            tick={{ fill: "currentColor" }}
            label={{ value: 'Daily Registrations', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            className="text-xs" 
            tick={{ fill: "currentColor" }}
            label={{ value: 'Cumulative Total', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="With University Affiliation"
            stackId="a"
            fill="#3b82f6"
          />
          <Bar
            yAxisId="left"
            dataKey="Without University Affiliation"
            stackId="a"
            fill="#94a3b8"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Cumulative Total"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ fill: "#16a34a", r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

