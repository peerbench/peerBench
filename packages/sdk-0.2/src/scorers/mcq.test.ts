import { describe, it, expect } from "vitest";
import { MCQScorer } from "./mcq";

describe("MCQScorer", () => {
  const scorer = new MCQScorer();

  describe("Direct answer comparison", () => {
    it("should score 1 for direct uppercase answer 'A'", async () => {
      const result = await scorer.score({
        response: "A",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers[0]).toBe("A");
    });

    it("should score 1 for direct lowercase answer 'b'", async () => {
      const result = await scorer.score({
        response: "b",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["B"],
      });
      expect(result.value).toBe(1);
    });
  });

  describe("JSON answer extraction", () => {
    it("should score 1 for correct JSON answer 'A'", async () => {
      const result = await scorer.score({
        response: '{"answer": "A"}',
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
      expect(result.extractedAnswers[0]).toBe("A");
    });

    it("should score 0 for incorrect JSON answer 'B'", async () => {
      const result = await scorer.score({
        response: '{"answer": "B"}',
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(0);
      expect(result.extractedAnswers[0]).toBe("B");
    });

    it("should extract first letter from JSON answer with extra text", async () => {
      const result = await scorer.score({
        response: '{"answer": "Answer is A"}',
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
    });
  });

  describe("Pattern matching", () => {
    it("should match 'Answer is A' pattern", async () => {
      const result = await scorer.score({
        response: "Answer is A",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
      // extractedAnswers is now always a string array
      expect(result.extractedAnswers).toBeInstanceOf(Array);
      expect(result.extractedAnswers[0]).toBe("A");
    });

    it("should match 'Answer is **A**' pattern", async () => {
      const result = await scorer.score({
        response: "Answer is **A**",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
    });

    it("should match 'A: Option A' pattern", async () => {
      const result = await scorer.score({
        response: "A: Option A",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
    });

    it("should match 'A)' pattern", async () => {
      const result = await scorer.score({
        response: "A)",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
    });

    it("should match choice text 'Option A'", async () => {
      const result = await scorer.score({
        response: "Answer is Option A",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      // Note: This test may fail due to a bug where the transform uppercases "Option A" to "OPTION A",
      // but validateAnswer compares it against the original choice value "Option A" (case-sensitive).
      // The pattern should match "Option A" and validate it against choices.
      // If this fails, it indicates the scorer needs to normalize both sides in validateAnswer.
      expect(result.value).toBe(1);
    });

    it("should match boxed pattern 'Answer is $\\boxed{A}$'", async () => {
      const result = await scorer.score({
        response: "Answer is $\\boxed{A}$",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(1);
    });

    it("should match boxed pattern with answer text 'Answer is $\\boxed{Option A}$'", async () => {
      const result = await scorer.score({
        response: "Answer is $\\boxed{Option A}$",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      // Note: This test may fail due to the same transform/validation bug as the choice text test.
      // The pattern should match "Option A" in the boxed expression and validate it.
      // If this fails, it indicates the scorer needs to normalize both sides in validateAnswer.
      expect(result.value).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("should score 1 when answer matches one of multiple correct answers", async () => {
      const result = await scorer.score({
        response: "Answer is A",
        choices: { A: "Option A", B: "Option B", C: "Option C" },
        correctAnswers: ["A", "B"],
      });
      expect(result.value).toBe(1);
    });

    it("should score 0 for wrong answer", async () => {
      const result = await scorer.score({
        response: "Answer is B",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(0);
    });

    it("should score 0 and have empty extractedAnswers when no match is found", async () => {
      const result = await scorer.score({
        response: "Some random text",
        choices: { A: "Option A", B: "Option B" },
        correctAnswers: ["A"],
      });
      expect(result.value).toBe(0);
      // extractedAnswers is now always a string array, empty when no matches
      expect(result.extractedAnswers).toBeInstanceOf(Array);
      expect(result.extractedAnswers.length).toBe(0);
    });
  });
});
