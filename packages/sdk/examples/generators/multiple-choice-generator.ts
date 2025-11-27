import { AbstractGenerator } from "@/generators/abstract/abstract-generator";
import { Prompt, PromptTypes } from "@/types";
import { z } from "zod";

/**
 * Simple example generator for multiple choice questions
 * Demonstrates basic question-answer generation
 *
 * This generator shows how to:
 * 1. Extend AbstractGenerator with proper typing
 * 2. Define input validation schema using Zod
 * 3. Generate prompts from source data
 * 4. Create multiple choice options with correct answers
 * 5. Use utility functions for CID and SHA256 calculations
 * 6. Return an array of Prompt objects as required by the abstract class
 */
export class MultipleChoiceGenerator extends AbstractGenerator {
  // Unique identifier for this generator - used for distinguishing it from other generators
  readonly identifier = "multiple-choice";

  // Input validation schema - defines what data this generator expects
  // This ensures type safety and validates input before processing
  inputSchema = z.object({
    id: z.string(), // Unique identifier for the source content
    title: z.string(), // Title of the content to generate questions about
    content: z.string(), // Main content text (not used in this simple example)
  });

  /**
   * Main generation method - converts input data into Prompt objects
   *
   * @param input - Already validated input data from the base class
   * @returns Promise<Prompt[]> - Array of generated prompts (required by AbstractGenerator)
   *
   * This method demonstrates the core workflow:
   * 1. Input is already validated by the base class
   * 2. Generate question text based on input
   * 3. Create answer options (correct + distractors)
   * 4. Shuffle options and track correct answer position
   * 5. Build the full prompt text
   * 6. Use buildPrompt helper to create Prompt object
   * 7. Return as array (AbstractGenerator requirement)
   */
  protected async generatePrompts(
    input: z.infer<(typeof this)["inputSchema"]>
  ): Promise<Prompt[]> {
    // Generate a simple question based on the input title
    // This is where you'd implement your question generation logic
    const question = `What is the main topic of "${input.title}"?`;

    // Create answer options: correct answer + distractors
    // In a real implementation, you might generate these dynamically
    const correctAnswer = input.title;
    const distractors = [
      "Machine Learning",
      "Artificial Intelligence",
      "Data Science",
    ];

    // Shuffle all options to randomize the order
    // This ensures the correct answer isn't always in the same position
    const allOptions = this.shuffleArray([correctAnswer, ...distractors]);

    // Find which letter (A, B, C, D) corresponds to the correct answer
    // This is needed for the answerKey field in the Prompt schema
    const answerKey = this.findAnswerKey(allOptions, correctAnswer);

    // Build the full prompt text that will be sent to the model
    // This includes the question and all options formatted clearly
    const fullPrompt = `${question}\n\nOptions:\n${allOptions.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join("\n")}`;

    // Create the Prompt object using the buildPrompt helper method
    // This ensures consistency and reduces boilerplate code
    const prompt = await this.buildPrompt({
      question,
      options: this.createOptionsObject(allOptions),
      correctAnswer: answerKey,
      fullPrompt,
      type: PromptTypes.MultipleChoice,
      metadata: {
        sourceId: input.id, // Link back to source content
        generatorType: "multiple-choice-generator", // Identify this generator
      },
    });

    // AbstractGenerator requires returning an array of Prompts
    // Even if generating just one prompt, wrap it in an array
    return [prompt];
  }

  /**
   * Shuffles an array using the Fisher-Yates algorithm
   * This ensures random but fair shuffling of answer options
   *
   * @param array - Array to shuffle
   * @returns New shuffled array (original is not modified)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]; // Create copy to avoid modifying original

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
    }

    return shuffled;
  }

  /**
   * Finds the letter key (A, B, C, D) for the correct answer
   * After shuffling, we need to know which position the correct answer ended up in
   *
   * @param options - Array of shuffled options
   * @param correctAnswer - The correct answer text to find
   * @returns Letter key (A, B, C, D) corresponding to the correct answer
   */
  private findAnswerKey(options: string[], correctAnswer: string): string {
    const index = options.findIndex((option) => option === correctAnswer);
    // Convert index to letter: 0->A, 1->B, 2->C, 3->D
    return String.fromCharCode(65 + index);
  }

  /**
   * Creates the options object required by the Prompt schema
   * Converts array of options into key-value pairs where keys are letters
   *
   * @param options - Array of option strings
   * @returns Object with letter keys (A, B, C, D) mapping to option text
   */
  private createOptionsObject(options: string[]): Record<string, string> {
    const result: Record<string, string> = {};

    // Map each option to its corresponding letter
    options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index); // 0->A, 1->B, etc.
      result[letter] = option;
    });

    return result;
  }
}
