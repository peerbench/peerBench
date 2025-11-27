"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ActivityData = {
  benchmarks: { date: string; count: number }[];
  prompts: { date: string; count: number }[];
  comments: { date: string; count: number }[];
  quickFeedbacks: { date: string; count: number }[];
  responses: { date: string; count: number }[];
  scores: { date: string; count: number }[];
};

export function ActivityCharts({ days }: { days: number }) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v2/stats/activity?days=${days}`);
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
        <h2 className="text-xl font-semibold mb-4">Activity Statistics</h2>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Activity Statistics</h2>
        <div className="h-96 flex items-center justify-center">
          <p className="text-red-500">Error: {error || "No data available"}</p>
        </div>
      </div>
    );
  }

  // Format data for each chart
  const formatChartData = (dataArray: { date: string; count: number }[]) =>
    dataArray.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: item.count,
    }));

  const benchmarksData = formatChartData(data.benchmarks);
  const promptsData = formatChartData(data.prompts);
  const commentsData = formatChartData(data.comments);
  const quickFeedbacksData = formatChartData(data.quickFeedbacks);
  const responsesData = formatChartData(data.responses);
  const scoresData = formatChartData(data.scores);

  const ActivityChart = ({
    title,
    data,
    color,
  }: {
    title: string;
    data: { date: string; count: number }[];
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: "currentColor", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="count" fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Activity Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActivityChart
          title="Benchmarks Created"
          data={benchmarksData}
          color="#8b5cf6"
        />
        <ActivityChart
          title="Prompts Created"
          data={promptsData}
          color="#10b981"
        />
        <ActivityChart
          title="Responses Created"
          data={responsesData}
          color="#06b6d4"
        />
        <ActivityChart
          title="Scores Created"
          data={scoresData}
          color="#ec4899"
        />
        <ActivityChart
          title="Comments Made"
          data={commentsData}
          color="#f59e0b"
        />
        <ActivityChart
          title="Quick Feedbacks Made"
          data={quickFeedbacksData}
          color="#ef4444"
        />
      </div>
    </div>
  );
}

