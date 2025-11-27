import { AbstractGenerator } from "@/generators/abstract/abstract-generator";
import { Prompt, PromptTypes } from "@/types";
import { z } from "zod";

/**
 * Simple example generator for sentence ordering tasks
 * Demonstrates basic sentence extraction and shuffling
 *
 * This generator shows how to:
 * 1. Extend AbstractGenerator with proper typing
 * 2. Define input validation schema using Zod
 * 3. Extract and process text content (sentences)
 * 4. Create sentence ordering challenges with shuffled options
 * 5. Generate answer keys based on original sentence order
 * 6. Use utility functions for CID and SHA256 calculations
 * 7. Use the buildPrompt helper method for consistent prompt creation
 * 8. Return an array of Prompt objects as required by the abstract class
 *
 * Sentence ordering tasks are useful for testing reading comprehension
 * and logical thinking skills by asking users to reconstruct coherent
 * paragraphs from shuffled sentences.
 */
export class SentenceOrderingGenerator extends AbstractGenerator {
  // Unique identifier for this generator - used for registration and identification
  readonly identifier = "sentence-ordering";

  // Input validation schema - defines what data this generator expects
  // This ensures type safety and validates input before processing
  inputSchema = z.object({
    id: z.string(), // Unique identifier for the source content
    title: z.string(), // Title of the content to generate questions about
    content: z.string(), // Main content text containing sentences to extract
  });

  /**
   * Main generation method - converts input data into sentence ordering Prompt objects
   *
   * @param input - Already validated input data from the base class
   * @returns Promise<Prompt[]> - Array of generated prompts (required by AbstractGenerator)
   *
   * This method demonstrates the core workflow:
   * 1. Input is already validated by the base class
   * 2. Extract sentences from the content text
   * 3. Select a subset of sentences for the task
   * 4. Create shuffled version of selected sentences
   * 5. Generate answer key based on original order
   * 6. Build question and full prompt text
   * 7. Use buildPrompt helper to create Prompt object
   * 8. Return as array (AbstractGenerator requirement)
   */
  protected async generatePrompts(
    input: z.infer<(typeof this)["inputSchema"]>
  ): Promise<Prompt[]> {
    // Extract individual sentences from the content text
    // This is where you'd implement your sentence parsing logic
    const sentences = this.extractSentences(input.content);

    // Take first 4 sentences for simplicity and manageability
    // In a real implementation, you might use more sophisticated selection criteria
    // such as sentence length, complexity, or semantic coherence
    const selectedSentences = sentences.slice(0, 4);

    // Create shuffled version of the selected sentences
    // This creates the challenge by randomizing the order
    // Users must figure out the original logical sequence
    const shuffledSentences = this.shuffleArray([...selectedSentences]);

    // Create answer key representing the correct order
    // This maps the shuffled positions back to the original sequence
    // Format: "3,1,2,4" means sentence 3 comes first, then 1, then 2, then 4
    const answerKey = this.createAnswerKey(
      selectedSentences,
      shuffledSentences
    );

    // Build the question text that explains the task
    const question = `Reorder the following sentences about "${input.title}" to form a coherent paragraph:`;

    // Create the full prompt that will be sent to the model
    // This includes the question, numbered sentences, and instructions
    const fullPrompt = `${question}\n\n${shuffledSentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nPlease provide the correct order (e.g., "3,1,2,4").`;

    // Create the Prompt object using the buildPrompt helper method
    // This ensures consistency and reduces boilerplate code
    const prompt = await this.buildPrompt({
      question,
      options: this.createOptionsObject(shuffledSentences),
      correctAnswer: answerKey,
      fullPrompt,
      type: PromptTypes.OrderSentences,
      metadata: {
        sourceId: input.id, // Link back to source content
        generatorType: "sentence-ordering-generator", // Identify this generator
        numSentences: selectedSentences.length, // Track how many sentences used
      },
    });

    // AbstractGenerator requires returning an array of Prompts
    // Even if generating just one prompt, wrap it in an array
    return [prompt];
  }

  /**
   * Extracts sentences from content text using punctuation-based splitting
   * This is a simple approach - in production you might use NLP libraries
   *
   * @param content - Raw text content to extract sentences from
   * @returns Array of individual sentences
   */
  private extractSentences(content: string): string[] {
    return content
      .split(/[.!?]+/) // Split on sentence-ending punctuation
      .map((s) => s.trim()) // Remove leading/trailing whitespace
      .filter((s) => s.length > 10 && s.length < 200); // Filter by reasonable length
  }

  /**
   * Shuffles an array using the Fisher-Yates algorithm
   * This ensures random but fair shuffling of sentence options
   *
   * @param array - Array to shuffle
   * @returns New shuffled array (original is not modified)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]; // Create copy to avoid modifying original

    // Fisher-Yates shuffle algorithm for unbiased randomization
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
    }

    return shuffled;
  }

  /**
   * Creates the answer key by mapping shuffled positions to original order
   * This is the core logic for sentence ordering tasks
   *
   * @param selectedSentences - Original sentences in correct order
   * @param shuffledSentences - Shuffled sentences (what user sees)
   * @returns Answer key string like "3,1,2,4"
   *
   * Example:
   * - Original: ["First", "Second", "Third", "Fourth"]
   * - Shuffled: ["Third", "First", "Second", "Fourth"]
   * - Answer: "3,1,2,4" (Third comes first, then First, then Second, then Fourth)
   */
  private createAnswerKey(
    selectedSentences: string[],
    shuffledSentences: string[]
  ): string {
    const answerIndices: number[] = [];

    // For each sentence in the original order, find where it ended up in the shuffled version
    for (const correctSentence of selectedSentences) {
      const shuffledIndex = shuffledSentences.findIndex(
        (sentence) => sentence === correctSentence
      );
      // Add 1 to convert from 0-based index to 1-based numbering for user display
      answerIndices.push(shuffledIndex + 1);
    }

    // Join indices with commas to create the answer key
    return answerIndices.join(",");
  }

  /**
   * Creates the options object required by the Prompt schema
   * Converts array of sentences into key-value pairs where keys are numbers
   *
   * @param sentences - Array of sentence strings
   * @returns Object with number keys (1, 2, 3, 4) mapping to sentence text
   */
  private createOptionsObject(sentences: string[]): Record<string, string> {
    const result: Record<string, string> = {};

    // Map each sentence to its corresponding number
    sentences.forEach((sentence, index) => {
      const number = String(index + 1); // Convert 0-based index to 1-based numbering
      result[number] = sentence;
    });

    return result;
  }
}
