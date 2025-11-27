"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownText } from "@/components/markdown-text";
import { useModelAPI } from "@/lib/hooks/use-model-api";
import { errorMessage } from "@/utils/error-message";
import { createClient } from "@/utils/supabase/client";
import { Trophy } from "lucide-react";

type MatchData = {
  id: string;
  winnerId: number | null;
  isShareable: boolean;
  createdAt: Date;
  modelA: {
    id: number;
    name: string;
    provider: string;
    modelId: string;
    owner: string;
    host: string;
    elo: number | null;
  };
  modelB: {
    id: number;
    name: string;
    provider: string;
    modelId: string;
    owner: string;
    host: string;
    elo: number | null;
  } | null;
  prompt: {
    id: string;
    question: string;
    fullPrompt: string;
    type: string;
  };
  responseA: any;
  responseB: any;
};

export default function SharedComparePage() {
  const params = useParams();
  const matchId = params.id as string;
  const modelAPI = useModelAPI();

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    async function fetchMatch() {
      if (!matchId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await modelAPI.getModelMatch(matchId);
        setMatchData(result.data);
      } catch (err) {
        console.error("Error fetching match:", err);
        setError(errorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchMatch();
  }, [matchId]);

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading comparison...</p>
        </div>
      </main>
    );
  }

  if (error || !matchData) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-gray-700 mb-4">Not Found</h1>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-2xl mx-auto">
            <p className="text-lg text-gray-600 mb-4">
              This comparison doesn&apos;t exist or is not publicly shared.
            </p>
            <p className="text-sm text-gray-500">
              {error ||
                "The link you're trying to access may be invalid or the comparison has not been shared."}
            </p>
          </div>
          <div className="mt-8">
            <a
              href="/compare"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Your Own Comparison
            </a>
          </div>
        </div>
      </main>
    );
  }

  const calculateMinHeight = () => {
    const responseALines = matchData.responseA?.data.split("\n").length || 0;
    const responseBLines = matchData.responseB?.data.split("\n").length || 0;
    const minLines = Math.min(responseALines, responseBLines);
    return Math.min(Math.max(minLines * 20, 200), 600);
  };

  const minHeight = calculateMinHeight();

  // Determine winner
  const isModelAWinner = matchData.winnerId === matchData.modelA.id;
  const isModelBWinner = matchData.winnerId === matchData.modelB?.id;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 mb-[200px] text-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-700">
            Shared Model Comparison
          </h1>
          {!isAuthenticated && (
            <p className="text-sm text-gray-500">
              This is a view-only comparison. Sign in to rate and score
              responses.
            </p>
          )}
        </div>

        {/* Prompt Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Prompt</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800 whitespace-pre-wrap">
              {matchData.prompt.question}
            </p>
          </div>
        </div>

        {/* Response Comparison */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-700">
              Model Responses
            </h2>
            <Badge variant="outline" className="text-sm">
              Models Revealed
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model A Response */}
            <Card
              className={
                isModelAWinner ? "border-2 border-green-500 bg-green-50/30" : ""
              }
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    Model A
                    {isModelAWinner && (
                      <Trophy className="h-5 w-5 text-green-600" />
                    )}
                  </span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {matchData.modelA.name || matchData.modelA.modelId}
                    {matchData.modelA.elo &&
                      ` (ELO: ${Math.round(matchData.modelA.elo)})`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`overflow-y-auto border rounded-lg p-4 ${
                    isModelAWinner
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: "800px",
                  }}
                >
                  {matchData.responseA ? (
                    <MarkdownText className="text-sm">
                      {matchData.responseA.response}
                    </MarkdownText>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Response not available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Model B Response */}
            <Card
              className={
                isModelBWinner ? "border-2 border-green-500 bg-green-50/30" : ""
              }
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    Model B
                    {isModelBWinner && (
                      <Trophy className="h-5 w-5 text-green-600" />
                    )}
                  </span>
                  {matchData.modelB && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {matchData.modelB.name || matchData.modelB.modelId}
                      {matchData.modelB.elo &&
                        ` (ELO: ${Math.round(matchData.modelB.elo)})`}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`overflow-y-auto border rounded-lg p-4 ${
                    isModelBWinner
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: "800px",
                  }}
                >
                  {matchData.responseB ? (
                    <MarkdownText className="text-sm">
                      {matchData.responseB.response}
                    </MarkdownText>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Response not available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Winner Announcement */}
        {matchData.winnerId && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
            className="text-center my-8"
          >
            <div className="inline-block bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 rounded-2xl p-1 shadow-2xl">
              <div className="bg-white rounded-xl px-8 py-6">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl self-center">🏆</span>
                  <div className="text-center space-y-1">
                    <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Winner
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      {matchData.winnerId === matchData.modelA.id
                        ? matchData.modelA.modelId || "Model A"
                        : matchData.modelB?.modelId || "Model B"}
                    </div>
                    {matchData.modelA.elo && matchData.modelB?.elo && (
                      <div className="text-sm text-gray-500 font-medium">
                        ELO:{" "}
                        {matchData.winnerId === matchData.modelA.id
                          ? Math.round(matchData.modelA.elo)
                          : Math.round(matchData.modelB.elo)}
                      </div>
                    )}
                  </div>
                  <span className="text-5xl self-center">🏆</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Call to action for unauthenticated users */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 shadow-lg">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Compare AI Models Yourself
              </h3>
              <p className="text-lg text-gray-700">
                Create your own model comparisons, rate responses, and
                contribute to our public leaderboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="/signup"
                  className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-xl text-lg"
                >
                  Sign Up Free
                </a>
                <a
                  href="/login"
                  className="inline-block bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-lg"
                >
                  Log In
                </a>
              </div>
              <p className="text-sm text-gray-600">
                Join thousands of users comparing AI models • No credit card
                required
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </main>
  );
}
