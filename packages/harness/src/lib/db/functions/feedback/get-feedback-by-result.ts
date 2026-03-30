import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Feedback } from "../../types";

export async function getFeedbackByResult(
  params: GetFeedbackByResultParams
): Promise<Feedback[]> {
  const client = getClient(params.tx);

  return client.feedback.findMany({
    where: { resultId: params.resultId },
    orderBy: { createdAt: "desc" },
  });
}

export type GetFeedbackByResultParams = {
  resultId: string;
  tx?: Prisma.TransactionClient;
};
