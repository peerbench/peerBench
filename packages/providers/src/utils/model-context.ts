import { RequestContext } from "@mastra/core/request-context";

export function buildModelContext(modelId: string) {
  return {
    modelId,
    modelOverride: modelId,
    aiSettings: {
      modelId,
      modelOverride: modelId,
    },
  };
}

export function buildModelRequestContext(modelId: string) {
  const ctx = new RequestContext();
  ctx.set("modelId", modelId);
  ctx.set("modelOverride", modelId);
  ctx.set("aiSettings", { modelId, modelOverride: modelId });
  return ctx;
}
