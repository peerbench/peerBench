import { describe, it, expect } from "vitest";
import { RegexScorer } from "./regex";

describe("RegexScorer", () => {
  const scorer = new RegexScorer();

  describe("Named groups extraction with Record expectedValue", () => {
    it("should score 1 for matching named group", async () => {
      const result = await scorer.score({
        input: "Answer is A",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "A" });
    });

    it("should score 0 for non-matching named group", async () => {
      const result = await scorer.score({
        input: "Answer is B",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({ answer: "B" });
    });

    it("should extract and match multiple named groups", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 25",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: { name: "John", age: "25" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "25" });
    });

    it("should score 0 when one of multiple groups doesn't match", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 25",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: { name: "John", age: "30" },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "25" });
    });
  });

  describe("Function validator expectedValue", () => {
    it("should score 1 when function validator returns true", async () => {
      const result = await scorer.score({
        input: "Answer is 42",
        patterns: [{ regex: /Answer is (?<answer>\d+)/g }],
        expectedValue: (groupName: string, match: string) => {
          if (groupName === "answer") {
            return parseInt(match) > 40;
          }
          return false;
        },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "42" });
    });

    it("should score 0 when function validator returns false", async () => {
      const result = await scorer.score({
        input: "Answer is 30",
        patterns: [{ regex: /Answer is (?<answer>\d+)/g }],
        expectedValue: (groupName: string, match: string) => {
          if (groupName === "answer") {
            return parseInt(match) > 40;
          }
          return false;
        },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({ answer: "30" });
    });

    it("should validate multiple groups with function validator", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 25",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: (groupName: string, match: string) => {
          if (groupName === "name") {
            return match.length > 3;
          }
          if (groupName === "age") {
            return parseInt(match) >= 18;
          }
          return false;
        },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "25" });
    });

    it("should score 0 when function validator fails for any group", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 15",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: (groupName: string, match: string) => {
          if (groupName === "name") {
            return match.length > 3;
          }
          if (groupName === "age") {
            return parseInt(match) >= 18;
          }
          return false;
        },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "15" });
    });
  });

  describe("Partial scoring", () => {
    it("should score 0.5 when allowPartialScoring is true and one of two groups matches", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 25",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: { name: "John", age: "30" },
        allowPartialScoring: true,
      });
      expect(result.value).toBe(0.5);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "25" });
    });

    it("should score 1 when allowPartialScoring is true and all groups match", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 25",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: { name: "John", age: "25" },
        allowPartialScoring: true,
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "25" });
    });

    it("should score 0 when allowPartialScoring is true and no groups match", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 25",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: { name: "Jane", age: "30" },
        allowPartialScoring: true,
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "25" });
    });

    it("should use partial scoring with function validator", async () => {
      const result = await scorer.score({
        input: "Name: John, Age: 15",
        patterns: [{ regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g }],
        expectedValue: (groupName: string, match: string) => {
          if (groupName === "name") {
            return match.length > 3;
          }
          if (groupName === "age") {
            return parseInt(match) >= 18;
          }
          return false;
        },
        allowPartialScoring: true,
      });
      // name passes (length > 3), age fails (< 18), so score is 0.5
      expect(result.value).toBe(0.5);
      expect(result.extractedAnswers).toEqual({ name: "John", age: "15" });
    });
  });

  describe("Unnamed groups with captureGroupIndex", () => {
    it("should not score when using unnamed groups (current limitation)", async () => {
      const result = await scorer.score({
        input: "Answer is A",
        patterns: [{ regex: /Answer is (\w+)/g }],
        expectedValue: { answer: "A" },
      });
      // Note: Unnamed groups are extracted but not stored in extractedValues,
      // so they cannot be used for scoring in the current implementation
      expect(result.value).toBe(0);
      // extractedAnswers will be empty for unnamed groups
      expect(result.extractedAnswers).toEqual({});
    });

    it("should not score when using specified capture group index (current limitation)", async () => {
      const result = await scorer.score({
        input: "First: A, Second: B",
        patterns: [
          {
            regex: /First: (\w+), Second: (\w+)/g,
            captureGroupIndex: 2,
          },
        ],
        expectedValue: { value: "B" },
      });
      // Note: Unnamed groups are extracted but not stored in extractedValues,
      // so they cannot be used for scoring in the current implementation
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });
  });

  describe("Transform functions", () => {
    it("should apply transform function to extracted value", async () => {
      const result = await scorer.score({
        input: "Answer is a",
        patterns: [
          {
            regex: /Answer is (?<answer>\w+)/g,
            transform: (value: string) => value.toUpperCase(),
          },
        ],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "A" });
    });

    it("should skip value when transform returns undefined", async () => {
      const result = await scorer.score({
        input: "Answer is invalid",
        patterns: [
          {
            regex: /Answer is (?<answer>\w+)/g,
            transform: (value: string) =>
              value === "invalid" ? undefined : value,
          },
        ],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(0);
      // The value should not be in extractedAnswers if transform returns undefined
      expect(result.extractedAnswers).toEqual({});
    });

    it("should apply transform to multiple groups", async () => {
      const result = await scorer.score({
        input: "Name: john, Age: 25",
        patterns: [
          {
            regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g,
            transform: (value: string) => value.toLowerCase(),
          },
        ],
        expectedValue: { name: "john", age: "25" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ name: "john", age: "25" });
    });
  });

  describe("Multiple patterns", () => {
    it("should use first matching pattern", async () => {
      const result = await scorer.score({
        input: "Answer is A",
        patterns: [
          { regex: /Answer is (?<answer>\w+)/g },
          { regex: /The answer is (?<answer>\w+)/g },
        ],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "A" });
    });

    it("should try patterns in order until one matches", async () => {
      const result = await scorer.score({
        input: "The answer is B",
        patterns: [
          { regex: /Answer is (?<answer>\w+)/g },
          { regex: /The answer is (?<answer>\w+)/g },
        ],
        expectedValue: { answer: "B" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "B" });
    });

    it("should handle patterns with different named groups", async () => {
      const result = await scorer.score({
        input: "The answer is C",
        patterns: [
          { regex: /Answer is (?<answer>\w+)/g },
          { regex: /The answer is (?<value>\w+)/g },
        ],
        expectedValue: { value: "C" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ value: "C" });
    });
  });

  describe("Match preference", () => {
    it("should use first match when matchPreference is 'first'", async () => {
      const result = await scorer.score({
        input: "Answer is A. Answer is B",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "A" },
        matchPreference: "first",
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "A" });
    });

    it("should use last match when matchPreference is 'last' (default)", async () => {
      const result = await scorer.score({
        input: "Answer is A. Answer is B",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "B" },
        matchPreference: "last",
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "B" });
    });

    it("should default to 'last' when matchPreference is not specified", async () => {
      const result = await scorer.score({
        input: "Answer is A. Answer is B",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "B" },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({ answer: "B" });
    });
  });

  describe("Edge cases", () => {
    it("should score 0 when no pattern matches", async () => {
      const result = await scorer.score({
        input: "Some random text",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });

    it("should score 0 for empty input", async () => {
      const result = await scorer.score({
        input: "",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });

    it("should handle empty patterns array", async () => {
      const result = await scorer.score({
        input: "Answer is A",
        patterns: [],
        expectedValue: { answer: "A" },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });

    it("should handle pattern with no named groups and no capture groups", async () => {
      const result = await scorer.score({
        input: "Answer is A",
        patterns: [{ regex: /Answer is A/g }],
        expectedValue: { answer: "A" },
      });
      // No groups to extract, so no value to match against
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });

    it("should handle multiple named groups where pattern doesn't fully match", async () => {
      const result = await scorer.score({
        input: "Name: John",
        patterns: [
          {
            regex: /Name: (?<name>\w+), Age: (?<age>\d+)/g,
          },
        ],
        expectedValue: { name: "John", age: "25" },
      });
      // Pattern doesn't match, so no extraction
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });

    it("should handle case-sensitive matching", async () => {
      const result = await scorer.score({
        input: "Answer is a",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: { answer: "A" }, // Uppercase expected
      });
      expect(result.value).toBe(0); // Lowercase 'a' doesn't match uppercase 'A'
      expect(result.extractedAnswers).toEqual({ answer: "a" });
    });

    it("should handle function validator that returns false for all groups", async () => {
      const result = await scorer.score({
        input: "Answer is negative",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: (groupName: string, match: string) => {
          return match.length > 10;
        },
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({ answer: "negative" });
    });

    it("should handle complex regex with multiple named groups", async () => {
      const result = await scorer.score({
        input: "User: admin@example.com logged in at 2024-01-01",
        patterns: [
          {
            regex:
              /User: (?<email>[\w.]+@[\w.]+) logged in at (?<date>\d{4}-\d{2}-\d{2})/g,
          },
        ],
        expectedValue: {
          email: "admin@example.com",
          date: "2024-01-01",
        },
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers).toEqual({
        email: "admin@example.com",
        date: "2024-01-01",
      });
    });

    it("should handle function validator with no extracted values", async () => {
      const result = await scorer.score({
        input: "Some random text",
        patterns: [{ regex: /Answer is (?<answer>\w+)/g }],
        expectedValue: (_groupName: string, _match: string) => true,
      });
      // No values extracted, so score is 0
      expect(result.value).toBe(0);
      expect(result.extractedAnswers).toEqual({});
    });
  });

  describe("Scorer properties", () => {
    it("should have correct kind", () => {
      expect(scorer.kind).toBe("regex");
    });
  });
});
