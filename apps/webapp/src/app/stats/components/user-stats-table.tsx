"use client";

import { useEffect, useState, useMemo } from "react";
import { Check, X, Search, Copy } from "lucide-react";

type UserStats = {
  id: string;
  email: string;
  email_confirmed_at: string;
  benchmarks_created: number;
  prompts_in_own_benchmarks: number;
  prompts_in_other_benchmarks: number;
  total_prompts_created: number;
  comments_made: number;
  quick_feedbacks_made: number;
  onboarding_complete: boolean;
  has_org_affiliation: boolean;
};

type UserStatsTableProps = {
  days?: number;
};

export function UserStatsTable({ days }: UserStatsTableProps) {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const url = days 
          ? `/api/v2/stats/users?days=${days}` 
          : "/api/v2/stats/users";
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const result = await response.json();
        setUsers(result.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [days]);

  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedUserId(userId);
      setTimeout(() => setCopiedUserId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Filter users based on search term and onboarding status
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((user) =>
        user.email.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Filter by onboarding status
    if (showOnlyIncomplete) {
      filtered = filtered.filter((user) => !user.onboarding_complete);
    }
    
    return filtered;
  }, [users, searchTerm, showOnlyIncomplete]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">User Statistics</h2>
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">User Statistics</h2>
        <div className="h-96 flex items-center justify-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">User Statistics</h2>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Filter Checkbox */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="incomplete-only"
            checked={showOnlyIncomplete}
            onChange={(e) => setShowOnlyIncomplete(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="incomplete-only"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Show only users who haven&apos;t completed onboarding
          </label>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-center font-medium">Benchmarks</th>
              <th className="px-4 py-3 text-center font-medium">
                Prompts (Own)
              </th>
              <th className="px-4 py-3 text-center font-medium">
                Prompts (Other)
              </th>
              <th className="px-4 py-3 text-center font-medium">Comments</th>
              <th className="px-4 py-3 text-center font-medium">
                Quick Feedbacks
              </th>
              <th className="px-4 py-3 text-center font-medium">
                Uni Affiliation
              </th>
              <th className="px-4 py-3 text-center font-medium">
                Onboarding Complete
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
              >
                <td className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs">
                      {user.email}{" "}
                      <span className="text-gray-500">({user.id})</span>
                    </div>
                    <button
                      onClick={() => copyUserId(user.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Copy user ID"
                    >
                      {copiedUserId === user.id ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      user.benchmarks_created >= 1
                        ? "text-green-600 dark:text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {user.benchmarks_created}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      user.prompts_in_own_benchmarks >= 3
                        ? "text-green-600 dark:text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {user.prompts_in_own_benchmarks}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      user.prompts_in_other_benchmarks >= 3
                        ? "text-green-600 dark:text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {user.prompts_in_other_benchmarks}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      user.comments_made >= 3
                        ? "text-green-600 dark:text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {user.comments_made}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      user.quick_feedbacks_made >= 3
                        ? "text-green-600 dark:text-green-400 font-semibold"
                        : ""
                    }
                  >
                    {user.quick_feedbacks_made}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {user.has_org_affiliation ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {user.onboarding_complete ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No users found matching your search.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-md">
        <h3 className="text-sm font-semibold mb-2">Onboarding Criteria:</h3>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Minimum 1 benchmark created</li>
          <li>• Minimum 3 prompts created in their own benchmarks</li>
          <li>• Minimum 3 prompts created in other benchmarks</li>
          <li>• Minimum 3 comments made (on prompts, responses, or scores)</li>
          <li>• Minimum 3 quick feedbacks made (on prompts, scores, or responses)</li>
        </ul>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Values meeting criteria are highlighted in green.
        </p>
      </div>
    </div>
  );
}

