import { NULL_UUID } from "@/lib/constants";
import { ModelLeaderboard } from "@/components/model-leaderboard";
import { LeaderboardService } from "@/services/leaderboard.service";
import { ModelLeaderboardRow } from "@/components/model-leaderboard/row";

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
  const leaderboardData =
    await LeaderboardService.getModelLeaderboardForPromptSet({
      promptSetId: promptSetId,
      requestedByUserId: userId ?? NULL_UUID,
    });

  return (
    <ModelLeaderboard>
      {leaderboardData.map((item, index) => (
        <ModelLeaderboardRow
          key={item.model}
          index={index}
          promptCountThreshold={totalPromptCount * 0.7}
          {...item}
        />
      ))}
    </ModelLeaderboard>
  );
}
