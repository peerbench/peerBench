import { Hono } from "hono";
import {
  listAgents,
  getAgent,
  deleteAgent,
  importMastraAgents,
  performHealthCheckForAgent,
  performHealthCheckForAgents,
} from "../lib/db";
import { prisma } from "../lib/db/prisma";

export const agentsRouter = new Hono();

// List agents (includes lastHealthCheck)
agentsRouter.get("/", async (c) => {
  const search = c.req.query("search");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await listAgents({ search, limit, offset });
  return c.json(result);
});

// Get single agent (includes lastHealthCheck)
agentsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const agent = await getAgent(id);

  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  return c.json(agent);
});

// Delete agent
agentsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await deleteAgent(id);
  return c.json({ success: true });
});

// Import from Mastra
agentsRouter.post("/import", async (c) => {
  const body = await c.req.json<{ baseUrl: string }>();

  if (!body.baseUrl) {
    return c.json({ error: "baseUrl is required" }, 400);
  }

  try {
    const result = await importMastraAgents(body.baseUrl);
    return c.json(result);
  } catch (error) {
    return c.json({ error: `Import failed: ${error}` }, 500);
  }
});

// Trigger health check for a single agent
agentsRouter.post("/:id/health-check", async (c) => {
  const id = c.req.param("id");

  try {
    const result = await performHealthCheckForAgent(id);
    return c.json({ result });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Agent not found" }, 404);
    }
    throw error;
  }
});

// Trigger health check for all agents
agentsRouter.post("/health-check-all", async (c) => {
  const agents = await prisma.agent.findMany({ select: { id: true } });
  const agentIds = agents.map((a) => a.id);

  if (agentIds.length === 0) {
    return c.json({ results: [], checked: 0 });
  }

  const results = await performHealthCheckForAgents(agentIds);
  return c.json({ results, checked: results.length });
});
