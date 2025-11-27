import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export interface ModelPerformanceProps {
  responseAndScoreStats: Array<{
    modelName: string;
    avgScore: number | null;
    scoreCount: number | null;
  }>;
}

export default function ModelPerformance({
  responseAndScoreStats,
}: ModelPerformanceProps) {
  if (!responseAndScoreStats || responseAndScoreStats.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Model Performance</CardTitle>
        </div>
        <CardDescription>
          Performance metrics for different models on this Prompt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {responseAndScoreStats.map((scoreInfo, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {scoreInfo.modelName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="font-mono text-lg font-semibold">
                      {scoreInfo.avgScore?.toFixed(2) ?? "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {scoreInfo.scoreCount ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
