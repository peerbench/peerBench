import { prisma } from "./prisma";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  isNonEmptyString,
  readString,
  readStringArray,
  resolveUrlLike,
  uniqueStrings,
} from "@peerbench/core";

export function getClient(
  tx?: Prisma.TransactionClient
): PrismaClient | Prisma.TransactionClient {
  return tx ?? prisma;
}

export const excludePracticeRunsWhere = {
  NOT: { metadata: { path: ["isPracticeRun"], equals: true } },
} satisfies Prisma.RunWhereInput;

export const excludePracticeRunsSql = `(r.metadata->>'isPracticeRun' IS NULL OR r.metadata->>'isPracticeRun' != 'true')`;

export const agentDisplayNameSql = `COALESCE(a.name, a.agent_id)`;

export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function normalizeEndpointUrl(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol === "http:" ? "https:" : parsed.protocol;
    let normalized = `${protocol}//${parsed.host.toLowerCase()}`;
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (pathname && pathname !== "/") {
      normalized += pathname;
    }
    if (parsed.search) {
      normalized += parsed.search;
    }
    return normalized;
  } catch {
    return trimmed.replace(/\/+$/g, "");
  }
}

export function resolveConfigEndpoints(
  configJson: Record<string, unknown>
): string[] {
  const endpoints = readStringArray(configJson.endpoints);
  const endpoint = readString(configJson.endpoint);
  const endpointEnv = readString(configJson.endpoint_ENV);
  const endpointFromEnv = endpointEnv ? process.env[endpointEnv] : undefined;

  const fromFields =
    endpoints.length > 0 ? endpoints : endpoint ? [endpoint] : [];
  const resolved = fromFields
    .map((e) => normalizeEndpointUrl(resolveUrlLike(e)))
    .filter(isNonEmptyString);

  if (resolved.length > 0) {
    return uniqueStrings(resolved);
  }

  if (endpointFromEnv) {
    const envUrl = normalizeEndpointUrl(resolveUrlLike(endpointFromEnv));
    return envUrl ? [envUrl] : [];
  }

  return [];
}

export function resolveAgentNamesForMastra(
  configJson: Record<string, unknown>
): string[] {
  const targets = Array.isArray(configJson.targets)
    ? configJson.targets.filter(
        (v): v is Record<string, unknown> => typeof v === "object" && v !== null
      )
    : [];
  const mastraTargets = targets.filter(
    (t) => t.provider === "mastra" && typeof t.model === "string"
  );
  return uniqueStrings(
    mastraTargets.map((t) => String(t.model)).filter(isNonEmptyString)
  );
}

export function resolveModelSlugs(
  configJson: Record<string, unknown>
): string[] {
  const targets = Array.isArray(configJson.targets)
    ? configJson.targets.filter(
        (v): v is Record<string, unknown> => typeof v === "object" && v !== null
      )
    : [];
  return uniqueStrings(
    targets
      .map((t) => (typeof t.model === "string" ? t.model : undefined))
      .filter((m): m is string => typeof m === "string" && m.length > 0)
  );
}
