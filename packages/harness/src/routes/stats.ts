import { Hono } from "hono";
import {
  getRunStats,
  getDailyScores,
  getAgentMetrics,
  getAgentDailyPerformance,
  getAgentRunPerformance,
  getAgentOverview,
  listAgentConfigPerformance,
  listAgentConfigTestCasePerformance,
  getConfigStats,
  getComparisonTimeSeries,
  getLeaderboard,
  getLeaderboardFilters,
  getFilteredLeaderboard,
  getConfigDashboardSummaries,
} from "../lib/db";

export const statsRouter = new Hono();

// Get overall run stats
statsRouter.get("/runs", async (c) => {
  const stats = await getRunStats();
  return c.json(stats);
});

// Get daily scores for chart
statsRouter.get("/daily-scores", async (c) => {
  const days = parseInt(c.req.query("days") || "30", 10);
  const scores = await getDailyScores(days);
  return c.json(scores);
});

// Get agent performance metrics
statsRouter.get("/agents", async (c) => {
  const metrics = await getAgentMetrics();
  return c.json(metrics);
});

// Get agent performance over time (daily aggregated)
statsRouter.get("/agents/:id/performance", async (c) => {
  const agentId = c.req.param("id");
  const days = parseInt(c.req.query("days") || "30", 10);
  const configIdRaw = c.req.query("configId");
  const configId = configIdRaw === "none" ? null : configIdRaw || undefined;
  const configVersionRaw = c.req.query("configVersion");
  const parsedVersion =
    configVersionRaw !== undefined ? parseInt(configVersionRaw, 10) : undefined;
  const configVersion =
    parsedVersion !== undefined && !Number.isNaN(parsedVersion)
      ? parsedVersion
      : undefined;
  const series = await getAgentDailyPerformance(
    agentId,
    days,
    configId,
    configVersion
  );
  return c.json(series);
});

// Get agent run-level performance (individual runs with exact timestamps)
statsRouter.get("/agents/:id/runs-performance", async (c) => {
  const agentId = c.req.param("id");
  const days = parseInt(c.req.query("days") || "30", 10);
  const configIdRaw = c.req.query("configId");
  const configId = configIdRaw === "none" ? null : configIdRaw || undefined;
  const configVersionRaw = c.req.query("configVersion");
  const parsedVersion =
    configVersionRaw !== undefined ? parseInt(configVersionRaw, 10) : undefined;
  const configVersion =
    parsedVersion !== undefined && !Number.isNaN(parsedVersion)
      ? parsedVersion
      : undefined;
  const series = await getAgentRunPerformance(
    agentId,
    days,
    configId,
    configVersion
  );
  return c.json(series);
});

statsRouter.get("/agents/:id/overview", async (c) => {
  const agentId = c.req.param("id");
  const overview = await getAgentOverview(agentId);
  return c.json(overview);
});

statsRouter.get("/agents/:id/configs", async (c) => {
  const agentId = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const result = await listAgentConfigPerformance({ agentId, limit, offset });
  return c.json(result);
});

statsRouter.get("/agents/:id/test-cases", async (c) => {
  const agentId = c.req.param("id");
  const configIdRaw = c.req.query("configId");
  const limit = parseInt(c.req.query("limit") || "200", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const configId =
    configIdRaw === "none" ? null : configIdRaw ? configIdRaw : undefined;

  const result = await listAgentConfigTestCasePerformance({
    agentId,
    configId,
    limit,
    offset,
  });
  return c.json(result);
});

// Get config stats (for runs filtered by config)
statsRouter.get("/configs/:id", async (c) => {
  const configId = c.req.param("id");
  const days = parseInt(c.req.query("days") || "30", 10);
  const stats = await getConfigStats(configId, days);
  return c.json(stats);
});

// Combined dashboard stats (config-centric)
statsRouter.get("/dashboard", async (c) => {
  const data = await getConfigDashboardSummaries();
  return c.json(data);
});

// Get comparison data for multiple agents and configs
statsRouter.get("/comparison", async (c) => {
  const agentIds = c.req.queries("agentId") || [];
  const configIds = c.req.queries("configId") || [];
  const days = parseInt(c.req.query("days") || "30", 10);

  if (agentIds.length === 0 || configIds.length === 0) {
    return c.json({ data: [] });
  }

  const data = await getComparisonTimeSeries({ agentIds, configIds, days });
  return c.json({ data });
});

// Get leaderboard - targets ranked by accuracy per runner (legacy, grouped by runner)
statsRouter.get("/leaderboard", async (c) => {
  const runner = c.req.query("runner");
  const daysParam = c.req.query("days");
  const days = daysParam ? parseInt(daysParam, 10) : undefined;

  const leaderboard = await getLeaderboard({ runner, days });
  return c.json(leaderboard);
});

// Get leaderboard filter options
statsRouter.get("/leaderboard/filters", async (c) => {
  const filters = await getLeaderboardFilters();
  return c.json(filters);
});

// Get filtered leaderboard - flat list with comprehensive filters
statsRouter.get("/leaderboard/filtered", async (c) => {
  const tagsParam = c.req.query("tags");
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;
  const tagMode = c.req.query("tagMode") as "and" | "or" | undefined;
  const runner = c.req.query("runner");
  const scorer = c.req.query("scorer");
  const daysParam = c.req.query("days");
  const days = daysParam ? parseFloat(daysParam) : undefined;
  const minutesParam = c.req.query("minutes");
  const minutes = minutesParam ? parseInt(minutesParam, 10) : undefined;
  const configId = c.req.query("configId");
  const provider = c.req.query("provider");
  const agentId = c.req.query("agentId");
  const minResultsParam = c.req.query("minResults");
  const minResults = minResultsParam
    ? parseInt(minResultsParam, 10)
    : undefined;
  const compareAgentsParam = c.req.query("compareAgents");
  const compareAgents = compareAgentsParam
    ? compareAgentsParam.split(",").filter(Boolean)
    : undefined;
  const groupByPromptVersion = c.req.query("groupByPromptVersion") === "true";

  const entries = await getFilteredLeaderboard({
    tags,
    tagMode,
    runner,
    scorer,
    days,
    minutes,
    configId,
    provider,
    agentId,
    minResults,
    compareAgents,
    groupByPromptVersion,
  });
  return c.json({ entries });
});
