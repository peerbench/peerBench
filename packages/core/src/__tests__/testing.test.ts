import { describe, it, expect } from "vitest";
import {
  NoOpDummyTestCaseSchemaV1,
  NoOpDummyResponseSchemaV1,
  NoOpDummyScoreSchemaV1,
  NoOpDummyKind,
  NoopDummyStorage,
  NoOpDummyScorer,
} from "@/testing";

describe("noop-dummy schemas", () => {
  it("creates a valid test case", () => {
    const tc = NoOpDummyTestCaseSchemaV1.new({
      id: "test-1",
      input: "dummy input",
    });
    expect(tc.id).toBe("test-1");
    expect(tc.input).toBe("dummy input");
    expect(tc.kind).toBe(`${NoOpDummyKind}.tc`);
    expect(tc.namespace).toBe("peerbench.ai");
    expect(tc.schemaVersion).toBe(1);
  });

  it("creates a valid response", () => {
    const resp = NoOpDummyResponseSchemaV1.new({
      id: "resp-1",
      output: "dummy output",
      testCaseId: "test-1",
      startedAt: 1000,
      completedAt: 2000,
    });
    expect(resp.id).toBe("resp-1");
    expect(resp.output).toBe("dummy output");
    expect(resp.kind).toBe(`${NoOpDummyKind}.rs`);
  });

  it("creates a valid score", () => {
    const score = NoOpDummyScoreSchemaV1.new({
      id: "score-1",
      responseId: "resp-1",
      scoringMethod: "algo",
      value: 0.85,
      explanation: "test",
      randomValue: 0.85,
    });
    expect(score.id).toBe("score-1");
    expect(score.value).toBe(0.85);
    expect(score.kind).toBe(`${NoOpDummyKind}.sc`);
  });
});

describe("NoopDummyStorage", () => {
  it("generates test cases in-memory", async () => {
    const storage = new NoopDummyStorage({ count: 3 });
    await storage.init();
    const testCases = await storage.readAll();
    expect(testCases).toHaveLength(3);
    for (const tc of testCases) {
      expect(tc.kind).toBe(`${NoOpDummyKind}.tc`);
      expect(tc.input).toMatch(/^dummy-input-\d+$/);
    }
  });

  it("defaults to 1 test case", async () => {
    const storage = new NoopDummyStorage({});
    const testCases = await storage.readAll();
    expect(testCases).toHaveLength(1);
  });

  it("throws on write (read-only)", async () => {
    const storage = new NoopDummyStorage({});
    await expect(storage.write("key", {} as any)).rejects.toThrow(
      "NoopDummyStorage is read-only",
    );
  });
});

describe("NoOpDummyScorer", () => {
  it("returns random score when no fixedScore", async () => {
    const scorer = new NoOpDummyScorer({});
    const result = await scorer.score({});
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1);
    expect(result.explanation).toBe(
      "THIS IS A DUMMY SCORER THE SCORE IS RANDOM",
    );
  });

  it("returns fixed score when configured", async () => {
    const scorer = new NoOpDummyScorer({ fixedScore: 0.75 });
    const result = await scorer.score({});
    expect(result.value).toBe(0.75);
  });
});
