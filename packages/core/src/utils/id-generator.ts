import type { IdGenerator } from "../types/common";
import { randomUUID } from "node:crypto";

export const idGeneratorUUIDv7: IdGenerator = () => {
  return randomUUID();
};
