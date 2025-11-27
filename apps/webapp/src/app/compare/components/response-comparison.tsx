"use client";

import { usePageContext } from "../context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownText } from "@/components/markdown-text";
import { Trophy } from "lucide-react";
import Decimal from "decimal.js";
import { formatUsd } from "@/utils/format-usd";

export default function ResponseComparison() {
  const ctx = usePageContext();
  const comparison = ctx.currentComparison;

  if (!comparison) {
    return null;
  }

  // Calculate the minimum height based on shorter response
  const responseALines = comparison.responseA?.response.split("\n").length || 0;
  const responseBLines = comparison.responseB?.response.split("\n").length || 0;
  const minLines = Math.min(responseALines, responseBLines);

  // Dynamic height: small for short responses, tall for long ones
  // With tight line spacing, use ~20px per line
  // Min 200px, increases with content, caps at 600px before scrolling
  const minHeight = Math.min(Math.max(minLines * 20, 200), 600);

  // Determine winner when revealed
  const isModelAWinner =
    comparison.isRevealed &&
    comparison.ratingA !== null &&
    comparison.ratingB !== null &&
    comparison.ratingA > comparison.ratingB;
  const isModelBWinner =
    comparison.isRevealed &&
    comparison.ratingA !== null &&
    comparison.ratingB !== null &&
    comparison.ratingB > comparison.ratingA;

  // Calculate costs and determine which is more expensive
  const costA =
    comparison.responseA &&
    (comparison.responseA.inputCost || comparison.responseA.outputCost)
      ? new Decimal(comparison.responseA.inputCost || "0").plus(
          comparison.responseA.outputCost || "0"
        )
      : null;
  const costB =
    comparison.responseB &&
    (comparison.responseB.inputCost || comparison.responseB.outputCost)
      ? new Decimal(comparison.responseB.inputCost || "0").plus(
          comparison.responseB.outputCost || "0"
        )
      : null;

  const isModelAExpensive = costA && costB && costA.greaterThan(costB);
  const isModelBExpensive = costA && costB && costB.greaterThan(costA);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">
          2. Compare Responses
        </h2>
        {comparison.isRevealed && (
          <Badge variant="outline" className="text-sm">
            Models Revealed
          </Badge>
        )}
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
              {comparison.isRevealed && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {comparison.modelA.modelId}
                  {comparison.modelA.elo &&
                    ` (ELO: ${Math.round(comparison.modelA.elo)})`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`flex flex-col border rounded-lg p-4 ${
                isModelAWinner
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              }`}
              style={{
                minHeight: `${minHeight}px`,
                maxHeight: "800px",
                overflowY: "auto",
              }}
            >
              {comparison.responseA ? (
                <MarkdownText className="text-sm">
                  {comparison.responseA.response}
                </MarkdownText>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Generating response...
                </div>
              )}
            </div>
            {comparison.isRevealed &&
              comparison.responseA &&
              (comparison.responseA.inputCost ||
                comparison.responseA.outputCost) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Total Cost{isModelAExpensive && " (More Expensive)"}:
                    </span>
                    <span
                      className={`font-semibold ${isModelAExpensive ? "text-red-600" : "text-green-600"}`}
                    >
                      {formatUsd(
                        new Decimal(comparison.responseA.inputCost || "0").plus(
                          comparison.responseA.outputCost || "0"
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}
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
              {comparison.isRevealed && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {comparison.modelB.modelId}
                  {comparison.modelB.elo &&
                    ` (ELO: ${Math.round(comparison.modelB.elo)})`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`flex flex-col border rounded-lg p-4 ${
                isModelBWinner
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              }`}
              style={{
                minHeight: `${minHeight}px`,
                maxHeight: "800px",
                overflowY: "auto",
              }}
            >
              {comparison.responseB ? (
                <MarkdownText className="text-sm">
                  {comparison.responseB.response}
                </MarkdownText>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Generating response...
                </div>
              )}
            </div>
            {comparison.isRevealed &&
              comparison.responseB &&
              (comparison.responseB.inputCost ||
                comparison.responseB.outputCost) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Total Cost{isModelBExpensive && " (More Expensive)"}:
                    </span>
                    <span
                      className={`font-semibold ${isModelBExpensive ? "text-red-600" : "text-green-600"}`}
                    >
                      {formatUsd(
                        new Decimal(comparison.responseB.inputCost || "0").plus(
                          comparison.responseB.outputCost || "0"
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
