import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AbstractStorage } from "../types/storage";
import {
  NoOpDummyTestCaseSchemaV1,
  type NoOpDummyTestCaseV1,
} from "./noop-dummy-schema";
import { defineStorageEntry } from "@/registry/storage";

class NoopDummyStorage extends AbstractStorage<NoOpDummyTestCaseV1> {
  private readonly testCaseCount: number;

  constructor(config: { count?: number }) {
    super();
    this.testCaseCount = config.count ?? 1;
  }

  async init(): Promise<void> {}

  async read(key: string): Promise<NoOpDummyTestCaseV1 | null> {
    const all = await this.readAll();
    return all.find((tc) => tc.id === key) ?? null;
  }

  async readAll(): Promise<NoOpDummyTestCaseV1[]> {
    return Array.from({ length: this.testCaseCount }, (_, i) =>
      NoOpDummyTestCaseSchemaV1.new({
        id: randomUUID(),
        input: `dummy-input-${i}`,
      }),
    );
  }

  async write(
    _key: string,
    _value: NoOpDummyTestCaseV1,
    _params?: unknown,
  ): Promise<unknown> {
    throw new Error("NoopDummyStorage is read-only");
  }
}

const configSchema = z.object({
  count: z
    .number()
    .optional()
    .describe("Number of dummy test cases to generate."),
});

const meta = {
  configSchema,
  aliases: ["NoopDummyStorage"],
  description: "No-op dummy storage that generates test cases in-memory",
};

const noopDummyStorage = defineStorageEntry({
  ...meta,
  instantiateFromConfig(config, configSchema) {
    const { count } = configSchema!.parse(config.params ?? {});
    return new NoopDummyStorage({ count });
  },
});

export { NoopDummyStorage, noopDummyStorage, meta as noopDummyStorageMeta };
