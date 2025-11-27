import { AbstractCollector } from "@/collectors/abstract/abstract-collector";
import { promises as fs } from "fs";

/**
 * Simple example collector for local file system data
 * Demonstrates basic file reading and parsing
 *
 * This collector shows how to:
 * 1. Extend AbstractCollector with proper typing
 * 2. Implement file system operations safely
 * 3. Handle different file types and extensions
 * 4. Validate input sources before processing
 * 5. Implement error handling and fallbacks
 * 6. Return structured data that can be used by generators
 *
 * Use cases:
 * - Reading local text files for content generation
 * - Processing documents for educational content
 * - Collecting data from structured files (CSV, JSON, etc.)
 */
export class FileSystemCollector extends AbstractCollector<FileData[]> {
  // Unique identifier for this collector - used for registration and identification
  readonly identifier = "file-system";

  /**
   * Main collection method - reads and processes files from the local file system
   *
   * @param path - File path to collect data from (can be string or unknown)
   * @returns Promise<FileData[] | undefined> - Array of file data or undefined if failed
   *
   * This method demonstrates the core workflow:
   * 1. Validate the input source (must be a string file path)
   * 2. Check if the path exists and is a file (not a directory)
   * 3. Read and parse the file content
   * 4. Return structured data that can be consumed by generators
   *
   * Error handling:
   * - Throws error for invalid input types
   * - Throws error for non-file paths
   * - Returns undefined for file reading failures
   */
  async collect(path: unknown): Promise<FileData[] | undefined> {
    // Type guard: ensure the source is a string file path
    // This prevents runtime errors from invalid input types
    if (typeof path !== "string") {
      throw new Error("Source must be a file path");
    }

    // Check if the file exists and is actually a file (not a directory)
    // This prevents trying to read directories or non-existent files
    const stats = await fs.stat(path);
    if (!stats.isFile()) {
      throw new Error("Source must be a file");
    }

    // Attempt to read and parse the file
    // The readFile method handles the actual file reading and error handling
    const fileData = await this.readFile(path);

    // Return array format (even for single files) for consistency with other collectors
    // This makes it easier for generators to process multiple files uniformly
    return fileData ? [fileData] : [];
  }

  /**
   * Private helper method to read and parse individual files
   * This encapsulates the file reading logic and error handling
   *
   * @param filePath - Path to the file to read
   * @returns Promise<FileData | null> - Parsed file data or null if reading failed
   *
   * Features:
   * - Automatic file extension detection
   * - File size calculation
   * - Comprehensive error handling
   * - UTF-8 encoding support
   */
  private async readFile(filePath: string): Promise<FileData | null> {
    try {
      // Read file content as UTF-8 text
      // This handles most text-based files (txt, md, json, csv, etc.)
      const content = await fs.readFile(filePath, "utf-8");

      // Extract file extension for type identification
      // Useful for generators that need to handle different file formats
      const ext = filePath.split(".").pop()?.toLowerCase() || "";

      // Return structured data object
      // This provides generators with all the information they need
      return {
        path: filePath, // Full file path for reference
        content, // File contents as string
        extension: ext, // File extension (e.g., "txt", "md", "json")
        size: content.length, // Character count (useful for content analysis)
      };
    } catch (error) {
      // Log error for debugging but don't crash the application
      // This allows the collector to continue processing other files
      console.error(`Failed to read file ${filePath}:`, error);
      return null; // Signal failure to the calling method
    }
  }
}

/**
 * Data structure for file information
 * This interface defines what data is collected from each file
 *
 * Properties:
 * - path: Full file path for identification
 * - content: File contents as text string
 * - extension: File extension for type identification
 * - size: Character count for content analysis
 *
 * Generators can use this structured data to:
 * - Filter files by type or size
 * - Process content based on file format
 * - Track source files for attribution
 * - Implement file-specific logic
 */
interface FileData {
  path: string; // Full file path (e.g., "/path/to/document.txt")
  content: string; // File contents as UTF-8 text
  extension: string; // File extension without dot (e.g., "txt", "md")
  size: number; // Character count of file content
}
