import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Feedback } from "../../types";

export async function createFeedback(
  params: CreateFeedbackParams
): Promise<Feedback> {
  const client = getClient(params.tx);

  return client.feedback.create({
    data: {
      resultId: params.resultId,
      sentiment: params.sentiment,
      comment: params.comment ?? null,
      name: params.name || "Anonymous",
      userId: params.userId ?? null,
    },
  });
}

export type CreateFeedbackParams = {
  resultId: string;
  sentiment: "positive" | "negative";
  comment?: string | null;
  name?: string;
  userId?: string | null;
  tx?: Prisma.TransactionClient;
};
