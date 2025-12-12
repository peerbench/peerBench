import { NULL_UUID } from "@/lib/constants";
import { LeaderboardService } from "@/services/leaderboard.service";
import { PromptSetService } from "@/services/promptset.service";
import { LeaderboardClient } from "./leaderboard-client";

export interface LeaderboardProps {
  promptSetId: number;
  totalPromptCount: number;
  userId?: string;
}

export async function Leaderboard({
  promptSetId,
  totalPromptCount,
  userId,
}: LeaderboardProps) {
  const [leaderboardData, hasRole] = await Promise.all([
    LeaderboardService.getModelLeaderboardForPromptSet({
      promptSetId: promptSetId,
      requestedByUserId: userId ?? NULL_UUID,
    }),
    PromptSetService.hasRoleOnPromptSet({
      userId: userId ?? NULL_UUID,
      promptSetId: promptSetId,
    }),
  ]);

  return (
    <LeaderboardClient
      leaderboardData={leaderboardData}
      totalPromptCount={totalPromptCount}
      showThresholdWarning={hasRole}
    />
  );
}
