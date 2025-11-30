import { db } from "@/database/client";
import { promptsTable } from "@/database/schema";
import { authUsers } from "drizzle-orm/supabase";
import { eq } from "drizzle-orm";

export async function sendNegativePromptFeedbackEmail(promptId: string) {
  const apiKey = process.env.FORWARD_EMAIL_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;   

  if (!apiKey || !senderEmail) {
    console.error("Missing email env vars");
    return;
  }

  try {
    const [prompt] = await db
      .select({
        uploaderId: promptsTable.uploaderId,
        question: promptsTable.question,
      })
      .from(promptsTable)
      .where(eq(promptsTable.id, promptId))
      .limit(1); 

    if (!prompt?.uploaderId) return;

    const [owner] = await db
      .select({ email: authUsers.email })
      .from(authUsers)
      .where(eq(authUsers.id, prompt.uploaderId))
      .limit(1); 

    if (!owner?.email) return;

    const res = await fetch("https://api.forwardemail.net/v1/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`, 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail, 
        to: owner.email,
        subject: "Your prompt received a negative review",
        text: `Your prompt "${prompt.question || "your prompt"}" received a negative review.
                Someone left negative quick feedback on your prompt.
                Go check it out in your dashboard.`, 
      }),
    });

    if (!res.ok) {
      console.error(
        `Email API error ${res.status}:`,
        await res.text()
      );
    }
  } catch (err) {
    console.error("Error preparing or sending email:", err);
  }
}