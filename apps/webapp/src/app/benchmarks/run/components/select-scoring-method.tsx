"use client";

import { cn } from "@/utils/cn";
import { usePageContext } from "../context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, User, Bot, Zap, X } from "lucide-react";
import { BenchmarkScoringMethods, BenchmarkScoringMethod } from "../context";

export default function SelectScoringMethod() {
  const ctx = usePageContext();

  const handleScoringMethodChange = (value: BenchmarkScoringMethod) => {
    ctx.setScoringMethod(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Scoring Method
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Choose how you want to score the model responses
      </p>

      <RadioGroup
        value={ctx.scoringMethod}
        onValueChange={handleScoringMethodChange}
        className="flex w-full justify-between"
        disabled={ctx.isInputDisabled() || ctx.resultInfos.length > 0}
      >
        {/* Human Scoring Option */}
        <Card
          className={cn(
            "transition-all duration-200 cursor-pointer flex-1",
            ctx.scoringMethod === BenchmarkScoringMethods.human
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-blue-300",
            (ctx.isInputDisabled() || ctx.resultInfos.length > 0) &&
              "opacity-50 cursor-not-allowed"
          )}
          onClick={() =>
            !ctx.isInputDisabled() &&
            ctx.resultInfos.length === 0 &&
            handleScoringMethodChange(BenchmarkScoringMethods.human)
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value={BenchmarkScoringMethods.human}
                id="human"
                className="mt-1"
                disabled={ctx.isInputDisabled() || ctx.resultInfos.length > 0}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <Label
                    htmlFor="human"
                    className="text-lg font-semibold text-gray-700 cursor-pointer"
                  >
                    Human
                  </Label>
                  {ctx.scoringMethod === BenchmarkScoringMethods.human && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Manually score each response yourself
                </p>
                <div className="text-xs text-gray-500">
                  • Full control over scoring criteria
                  <br />
                  • Most accurate but time-consuming
                  <br />• Best for critical evaluations
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Scoring Option */}
        <Card
          className={cn(
            "transition-all duration-200 cursor-pointer flex-1",
            ctx.scoringMethod === BenchmarkScoringMethods.ai
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-green-300",
            (ctx.isInputDisabled() || ctx.resultInfos.length > 0) &&
              "opacity-50 cursor-not-allowed"
          )}
          onClick={() =>
            !ctx.isInputDisabled() &&
            ctx.resultInfos.length === 0 &&
            handleScoringMethodChange(BenchmarkScoringMethods.ai)
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value={BenchmarkScoringMethods.ai}
                id="model"
                className="mt-1"
                disabled={ctx.isInputDisabled() || ctx.resultInfos.length > 0}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Bot className="w-5 h-5 text-green-600" />
                  <Label
                    htmlFor="model"
                    className="text-lg font-semibold text-gray-700 cursor-pointer"
                  >
                    AI
                  </Label>
                  {ctx.scoringMethod === BenchmarkScoringMethods.ai && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Use an AI model to automatically score responses
                </p>
                <div className="text-xs text-gray-500">
                  • Fast and consistent scoring
                  <br />
                  • Requires selecting a scoring model
                  <br />• Good balance of speed and accuracy
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Scoring Option */}
        <Card
          className={cn(
            "transition-all duration-200 cursor-pointer flex-1",
            ctx.scoringMethod === BenchmarkScoringMethods.algo
              ? "border-purple-500 bg-purple-50"
              : "border-gray-200 hover:border-purple-300",
            (ctx.isInputDisabled() || ctx.resultInfos.length > 0) &&
              "opacity-50 cursor-not-allowed"
          )}
          onClick={() =>
            !ctx.isInputDisabled() &&
            ctx.resultInfos.length === 0 &&
            handleScoringMethodChange(BenchmarkScoringMethods.algo)
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value={BenchmarkScoringMethods.algo}
                id="auto"
                className="mt-1"
                disabled={ctx.isInputDisabled() || ctx.resultInfos.length > 0}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <Label
                    htmlFor="auto"
                    className="text-lg font-semibold text-gray-700 cursor-pointer"
                  >
                    Auto
                  </Label>
                  {ctx.scoringMethod === BenchmarkScoringMethods.algo && (
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Automatically choose the best scoring method
                </p>
                <div className="text-xs text-gray-500">
                  • Uses built-in scoring approaches when possible
                  <br />
                  • Falls back to human scoring for the Prompts that don&apos;t
                  have answers and AI for open-ended typed Prompts
                  <br />• Most convenient option
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* None Scoring Option */}
        <Card
          className={cn(
            "transition-all duration-200 cursor-pointer flex-1",
            ctx.scoringMethod === BenchmarkScoringMethods.none
              ? "border-gray-500 bg-gray-50"
              : "border-gray-200 hover:border-gray-300",
            (ctx.isInputDisabled() || ctx.resultInfos.length > 0) &&
              "opacity-50 cursor-not-allowed"
          )}
          onClick={() =>
            !ctx.isInputDisabled() &&
            ctx.resultInfos.length === 0 &&
            handleScoringMethodChange(BenchmarkScoringMethods.none)
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <RadioGroupItem
                value={BenchmarkScoringMethods.none}
                id="none"
                className="mt-1"
                disabled={ctx.isInputDisabled() || ctx.resultInfos.length > 0}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <X className="w-5 h-5 text-gray-600" />
                  <Label
                    htmlFor="none"
                    className="text-lg font-semibold text-gray-700 cursor-pointer"
                  >
                    No Scoring
                  </Label>
                  {ctx.scoringMethod === BenchmarkScoringMethods.none && (
                    <CheckCircle className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Save responses without scoring
                </p>
                <div className="text-xs text-gray-500">
                  • Responses are saved directly to database
                  <br />
                  • No scoring or evaluation performed
                  <br />• Useful for data collection only
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );
}
