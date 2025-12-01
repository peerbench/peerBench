import { useMemo } from "react";
import { usePageContext } from "../context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatMs } from "peerbench";
import { formatUsd } from "@/utils/format-usd";
import { LucideLoader2, LucideXCircle, LucideCheckCircle } from "lucide-react";
import Decimal from "decimal.js";

export default function Results() {
  const ctx = usePageContext();

  const totalPromptsToBeSent = useMemo(
    () => ctx.promptsToBeTested.length * ctx.selectedModels.length,
    [ctx.promptsToBeTested, ctx.selectedModels]
  );
  const totalResponsesReceived = useMemo(
    () =>
      ctx.resultInfos.reduce(
        (acc, result) => acc + result.responsesReceived,
        0
      ),
    [ctx.resultInfos]
  );
  const overallCost = useMemo(
    () =>
      ctx.resultInfos.reduce(
        (acc, result) => acc.add(result.totalCost),
        new Decimal(0)
      ),
    [ctx.resultInfos]
  );

  return (
    ctx.resultInfos.length > 0 && (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Results</h2>
          <div className="flex items-center space-x-4">
            {ctx.promptsToBeTested.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500">Total Progress:</div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-700 font-medium">
                    {totalResponsesReceived}
                  </span>
                  <span className="text-gray-500">/</span>
                  <span className="text-gray-500">{totalPromptsToBeSent}</span>
                  <span className="text-gray-500">prompts</span>
                </div>
                {/* Status indicator */}
                <div className="w-6 h-6 flex items-center justify-center">
                  {ctx.isRunning ? (
                    <LucideLoader2 className="animate-spin text-yellow-500 w-5 h-5" />
                  ) : ctx.benchmarkAbortController.current?.signal.aborted ? (
                    <LucideXCircle className="text-red-500 w-5 h-5" />
                  ) : totalResponsesReceived === totalPromptsToBeSent &&
                    totalPromptsToBeSent > 0 ? (
                    <LucideCheckCircle className="text-green-500 w-5 h-5" />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Provider</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The provider of the model</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Model</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The name of the model</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Status</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Current progress of prompts processed for this model
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Avg. Latency</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Average time taken to process each prompt</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Accuracy</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Average score across all prompts (0-1)</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Results</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Breakdown of correct (✓), wrong (✗), and unknown (?)
                        answers
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Cost</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Input + Output + AI Scorer (if there is any) costs</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ctx.resultInfos.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.model.provider}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.model.modelId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2">
                          {ctx.isRunning &&
                          result.responsesReceived <
                            ctx.promptsToBeTested.length ? (
                            <LucideLoader2 className="animate-spin h-4 w-4 text-yellow-500" />
                          ) : result.responsesReceived ===
                            ctx.promptsToBeTested.length ? (
                            <LucideCheckCircle className="h-4 w-4 text-green-500" />
                          ) : null}
                          <span>
                            {result.responsesReceived} /{" "}
                            {ctx.promptsToBeTested.length}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {result.responsesReceived} out of{" "}
                          {ctx.promptsToBeTested.length} prompts processed
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          {formatMs(
                            result.totalLatency / result.responsesReceived || 0
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total latency: {formatMs(result.totalLatency)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          {(
                            (result.totalScore / ctx.promptsToBeTested.length) *
                            100
                          ).toFixed(2)}
                          %
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total score: {result.totalScore}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-1">
                            <span className="text-green-600">✓</span>
                            <span>{result.correctAnswers}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{result.correctAnswers} (correct)</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-1">
                            <span className="text-red-600">✗</span>
                            <span>{result.wrongAnswers}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{result.wrongAnswers} (wrong)</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-1">
                            <span className="text-yellow-600">?</span>
                            <span>{result.unknownAnswers}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{result.unknownAnswers} (unknown)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    <span>{formatUsd(result.totalCost)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!ctx.isRunning && (
          <div className="mt-4 p-3 w-full bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-green-700">Overall Cost:</span>
              <span className="text-sm text-green-600">
                {formatUsd(overallCost)}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  );
}
