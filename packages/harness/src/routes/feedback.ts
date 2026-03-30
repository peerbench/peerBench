import { Hono } from "hono";
import {
  createFeedback,
  getFeedbackByResult,
  listFeedback,
  getFeedbackStats,
} from "../lib/db";

export const feedbackRouter = new Hono();

feedbackRouter.get("/stats", async (c) => {
  const daysParam = c.req.query("days");
  const days = daysParam ? parseInt(daysParam, 10) : undefined;

  const stats = await getFeedbackStats({ days });
  return c.json(stats);
});

feedbackRouter.get("/:runResultId", async (c) => {
  const runResultId = c.req.param("runResultId");
  const feedback = await getFeedbackByResult({ resultId: runResultId });
  return c.json(feedback);
});

feedbackRouter.get("/", async (c) => {
  const configId = c.req.query("configId");
  const sentiment = c.req.query("sentiment") as
    | "positive"
    | "negative"
    | undefined;
  const daysParam = c.req.query("days");
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");

  const days = daysParam ? parseInt(daysParam, 10) : undefined;
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const result = await listFeedback({
    configId: configId || undefined,
    sentiment:
      sentiment === "positive" || sentiment === "negative"
        ? sentiment
        : undefined,
    days: days && !isNaN(days) ? days : undefined,
    limit,
    offset,
  });

  return c.json(result);
});

feedbackRouter.post("/", async (c) => {
  const body = await c.req.json();

  if (!body.resultId || typeof body.resultId !== "string") {
    return c.json({ error: "resultId is required" }, 400);
  }

  if (body.sentiment !== "positive" && body.sentiment !== "negative") {
    return c.json({ error: "sentiment must be 'positive' or 'negative'" }, 400);
  }

  const feedback = await createFeedback({
    resultId: body.resultId,
    sentiment: body.sentiment,
    comment: typeof body.comment === "string" ? body.comment : undefined,
    name:
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Anonymous",
    userId: typeof body.userId === "string" ? body.userId : undefined,
  });

  return c.json(feedback, 201);
});
