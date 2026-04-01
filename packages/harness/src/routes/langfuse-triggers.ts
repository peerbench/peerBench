import { Hono } from "hono";
import {
  getLangfuseTriggersWithConfigs,
  getLangfuseTrigger,
  createLangfuseTrigger,
  updateLangfuseTrigger,
  deleteLangfuseTrigger,
  listConfigs,
} from "../lib/db";
import {
  isLangfuseConfigured,
  manualLangfuseSync,
  listLangfusePrompts,
  handleLangfuseWebhook,
  verifyLangfuseSignature,
  type LangfuseWebhookPayload,
} from "../lib/langfuse-poller";

export const langfuseTriggersRouter = new Hono();

// Check if Langfuse is configured
langfuseTriggersRouter.get("/status", async (c) => {
  return c.json({
    configured: isLangfuseConfigured(),
    host: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
  });
});

// List Langfuse triggers with config names
langfuseTriggersRouter.get("/", async (c) => {
  const search = c.req.query("search");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await getLangfuseTriggersWithConfigs({ search, limit, offset });
  return c.json(result);
});

// Get single trigger
langfuseTriggersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const trigger = await getLangfuseTrigger(id);

  if (!trigger) {
    return c.json({ error: "Langfuse trigger not found" }, 404);
  }

  return c.json(trigger);
});

// Create trigger
langfuseTriggersRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name: string;
    promptName: string;
    configId: string;
    debounceSeconds?: number;
    enabled?: boolean;
  }>();

  if (!body.name || !body.promptName || !body.configId) {
    return c.json(
      { error: "name, promptName, and configId are required" },
      400
    );
  }

  if (body.debounceSeconds !== undefined && body.debounceSeconds < 1) {
    return c.json({ error: "debounceSeconds must be at least 1" }, 400);
  }

  const trigger = await createLangfuseTrigger(body);
  return c.json(trigger, 201);
});

// Update trigger
langfuseTriggersRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    promptName?: string;
    configId?: string;
    debounceSeconds?: number;
    enabled?: boolean;
  }>();

  if (body.debounceSeconds !== undefined && body.debounceSeconds < 1) {
    return c.json({ error: "debounceSeconds must be at least 1" }, 400);
  }

  const trigger = await updateLangfuseTrigger(id, body);

  if (!trigger) {
    return c.json({ error: "Langfuse trigger not found" }, 404);
  }

  return c.json(trigger);
});

// Delete trigger
langfuseTriggersRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await deleteLangfuseTrigger(id);
  return c.json({ success: true });
});

// Get configs for dropdown (helper endpoint)
langfuseTriggersRouter.get("/meta/configs", async (c) => {
  const result = await listConfigs({ limit: 200 });
  return c.json({
    configs: result.configs.map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
    })),
  });
});

// Get available Langfuse prompts for dropdown
langfuseTriggersRouter.get("/meta/prompts", async (c) => {
  if (!isLangfuseConfigured()) {
    return c.json({ prompts: [], error: "Langfuse not configured" });
  }

  const prompts = await listLangfusePrompts();
  return c.json({ prompts });
});

// Manually trigger a sync
langfuseTriggersRouter.post("/sync", async (c) => {
  if (!isLangfuseConfigured()) {
    return c.json({ error: "Langfuse not configured" }, 400);
  }

  const result = await manualLangfuseSync();
  return c.json(result);
});

// Webhook endpoint for Langfuse to push prompt changes
// Configure this URL in Langfuse Automations: POST /api/langfuse-triggers/webhook
langfuseTriggersRouter.post("/webhook", async (c) => {
  // Get raw body for signature verification
  const rawBody = await c.req.text();

  // Verify signature if secret is configured
  const webhookSecret = process.env.LANGFUSE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signatureHeader = c.req.header("x-langfuse-signature");
    console.log("[Langfuse Webhook] Signature header:", signatureHeader);
    console.log("[Langfuse Webhook] Secret configured:", webhookSecret ? "yes (length: " + webhookSecret.length + ")" : "no");

    if (!signatureHeader) {
      console.warn("[Langfuse Webhook] Missing signature header");
      return c.json({ error: "Missing signature" }, 401);
    }

    const isValid = verifyLangfuseSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) {
      console.warn("[Langfuse Webhook] Invalid signature - header:", signatureHeader);
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  // Parse the payload
  let payload: LangfuseWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LangfuseWebhookPayload;
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  // Validate payload structure
  if (payload.type !== "prompt-version" || !payload.prompt?.name) {
    return c.json({ error: "Invalid webhook payload" }, 400);
  }

  // Process the webhook
  const result = await handleLangfuseWebhook(payload);

  // Return 200 to acknowledge receipt (Langfuse expects 2xx)
  return c.json(result, result.success ? 200 : 500);
});
