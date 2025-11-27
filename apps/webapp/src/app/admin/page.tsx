"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Check, X, Copy, CheckCheck } from "lucide-react";
import { toast } from "react-toastify";

interface UserActivityMetrics {
  userId: string;
  email: string;
  emailDomain: string;
  displayName: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastSignInAt: string | null;
  lastFeedbackAt: string | null;
  lastScoreAt: string | null;
  hasCreatedBenchmark: boolean;
  contributedBenchmarksCount: number;
  hasContributedToMultipleBenchmarks: boolean;
  hasGivenQuickFeedback: boolean;
  hasGivenScores: boolean;
  totalBenchmarksOwned: number;
  totalPromptsUploaded: number;
  totalFeedbackGiven: number;
  totalScoresGiven: number;
  organizationName: string | null;
}

interface SignupTrend {
  date: string;
  verifiedSignups: number;
  totalSignups: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserActivityMetrics[]>([]);
  const [signupTrends, setSignupTrends] = useState<SignupTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [sortBy, setSortBy] = useState<"newest" | "active" | "rank">("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSignupTrends();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const loadSignupTrends = async () => {
    try {
      const params = new URLSearchParams({
        period,
        ...(period === "daily" ? { days: "90" } : { weeks: "12" }),
      });
      const response = await fetch(`/api/v1/admin/signups?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch signup trends");
      }
      const data = await response.json();
      setSignupTrends(data.trends);
    } catch (err) {
      console.error("Error loading signup trends:", err);
    }
  };

  const copyToClipboard = async (text: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(userId);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy");
    }
  };

  const getSortedUsers = () => {
    const sorted = [...users];
    switch (sortBy) {
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "active":
        return sorted.sort((a, b) => {
          const aActivity = Math.max(
            new Date(a.lastFeedbackAt || 0).getTime(),
            new Date(a.lastScoreAt || 0).getTime(),
            new Date(a.lastSignInAt || 0).getTime()
          );
          const bActivity = Math.max(
            new Date(b.lastFeedbackAt || 0).getTime(),
            new Date(b.lastScoreAt || 0).getTime(),
            new Date(b.lastSignInAt || 0).getTime()
          );
          return bActivity - aActivity;
        });
      case "rank":
        return sorted.sort((a, b) => {
          const aScore =
            a.totalBenchmarksOwned * 10 +
            a.totalPromptsUploaded * 2 +
            a.totalFeedbackGiven +
            a.totalScoresGiven;
          const bScore =
            b.totalBenchmarksOwned * 10 +
            b.totalPromptsUploaded * 2 +
            b.totalFeedbackGiven +
            b.totalScoresGiven;
          return bScore - aScore;
        });
      default:
        return sorted;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const sortedUsers = getSortedUsers();
  const verifiedUsers = users.filter((u) => u.emailVerifiedAt).length;
  const activeUsers = users.filter(
    (u) =>
      u.lastSignInAt &&
      new Date(u.lastSignInAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Verified Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              With Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.hasCreatedBenchmark).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signup Trends Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Signup Trends</CardTitle>
            <Tabs
              value={period}
              onValueChange={(v) => setPeriod(v as "daily" | "weekly")}
            >
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signupTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="verifiedSignups"
                stroke="#22c55e"
                name="Verified Signups"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="totalSignups"
                stroke="#3b82f6"
                name="Total Signups"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>User Activity</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "newest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("newest")}
              >
                Newest
              </Button>
              <Button
                variant={sortBy === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("active")}
              >
                Most Active
              </Button>
              <Button
                variant={sortBy === "rank" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("rank")}
              >
                Top Ranked
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email Domain</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-center">
                    Created Benchmark
                  </TableHead>
                  <TableHead className="text-center">
                    Contributed (4+)
                  </TableHead>
                  <TableHead className="text-center">Quick Feedback</TableHead>
                  <TableHead className="text-center">All Scores</TableHead>
                  <TableHead>Stats</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => {
                  const lastActivity = [
                    user.lastFeedbackAt,
                    user.lastScoreAt,
                    user.lastSignInAt,
                  ]
                    .filter(Boolean)
                    .sort()
                    .reverse()[0];

                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[120px]">
                            {user.userId}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(user.userId, user.userId)
                            }
                            className="h-6 w-6 p-0"
                          >
                            {copiedId === user.userId ? (
                              <CheckCheck className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.displayName || "—"}
                          </div>
                          {!user.emailVerifiedAt && (
                            <Badge variant="outline" className="text-xs">
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.emailDomain}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.organizationName || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(lastActivity || null)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.hasCreatedBenchmark ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {user.hasContributedToMultipleBenchmarks ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300" />
                          )}
                          <span className="text-xs text-gray-500">
                            ({user.contributedBenchmarksCount})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {user.hasGivenQuickFeedback ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300" />
                          )}
                          <span className="text-xs text-gray-500">
                            ({user.totalFeedbackGiven})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {user.hasGivenScores ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300" />
                          )}
                          <span className="text-xs text-gray-500">
                            ({user.totalScoresGiven})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {user.totalBenchmarksOwned}B
                          </Badge>
                          <Badge variant="secondary">
                            {user.totalPromptsUploaded}Q
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
