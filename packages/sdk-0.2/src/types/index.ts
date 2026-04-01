export * from "./runner";

import { IdSchema } from "@/schemas/id";
import z from "zod";

export type Id = z.infer<typeof IdSchema>;

export type IdGenerator<TInput = unknown> = (input: TInput) => MaybePromise<Id>;

export type MaybePromise<T> = T | Promise<T>;

export const ScoringMethod = {
  ai: "ai",
  human: "human",
  algo: "algo",
} as const;
export type ScoringMethod = (typeof ScoringMethod)[keyof typeof ScoringMethod];
