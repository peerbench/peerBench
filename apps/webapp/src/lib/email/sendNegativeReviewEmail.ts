import { db } from "@/database/client";
import { promptsTable } from "@/database/schema";
import { authUsers } from "drizzle-orm/supabase";
import { eq } from "drizzle-orm";

export async function sendNegativePromptFeedbackEmail(promptId: string) {
  const [prompt] = await db
    .select({
      uploaderId: promptsTable.uploaderId,
      question: promptsTable.question,
    })
    .from(promptsTable)
    .where(eq(promptsTable.id, promptId));

  if (!prompt?.uploaderId) return;

  const [owner] = await db
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.id, prompt.uploaderId));

  if (!owner?.email) return;

    await fetch("https://api.forwardemail.net/v1/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FORWARD_EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${process.env.SENDER_EMAIL}`,
      to: owner.email,
      subject: "Your prompt received a negative review",
      text: `Your prompt "${prompt.question || "your prompt"}" received a negative review.
            Someone left negative quick feedback on your prompt.  
            Go check it out in your dashboard.`,
    }),
  });
}
