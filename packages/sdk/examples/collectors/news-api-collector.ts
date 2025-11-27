import { AbstractCollector } from "@/collectors/abstract/abstract-collector";

/**
 * Simple example collector for NewsAPI
 * Demonstrates basic API-based data collection
 *
 * This collector shows how to:
 * 1. Extend AbstractCollector with proper typing
 * 2. Implement API-based data collection with authentication
 * 3. Handle HTTP requests and responses safely
 * 4. Process and structure external API data
 * 5. Implement configurable options for collection behavior
 * 6. Handle API errors and edge cases
 * 7. Return structured data that can be used by generators
 *
 * Note: This is just for demonstration purpose, there is no `newsapi.org`
 * In a real implementation, you would use an actual news API service.
 *
 * Use cases:
 * - Collecting current events for educational content
 * - Gathering news articles for summarization tasks
 * - Creating content based on trending topics
 * - Building datasets from real-time information sources
 */
export class NewsAPICollector extends AbstractCollector<NewsArticle[]> {
  // Unique identifier for this collector - used for registration and identification
  readonly identifier = "news-api";

  // API configuration - these would be set during initialization
  private baseUrl = "https://newsapi.org/v2"; // Base URL for API endpoints

  /**
   * Main collection method - fetches news articles based on search query
   *
   * @param searchQuery - Search term to find relevant news articles
   * @param options - Optional configuration for the collection process
   * @returns Promise<NewsArticle[] | undefined> - Array of news articles or undefined if failed
   *
   * This method demonstrates the core workflow:
   * 1. Validate the input source (must be a string search query)
   * 2. Build the API request URL with proper parameters
   * 3. Make HTTP request to the external API
   * 4. Handle response and error cases
   * 5. Parse and structure the returned data
   * 6. Return formatted articles for generators to use
   *
   * Error handling:
   * - Throws error for invalid input types
   * - Throws error for HTTP request failures
   * - Returns empty array for successful requests with no results
   */
  async collect(
    searchQuery: string,
    options: {
      includeSensitiveContent?: boolean; // Option to include sensitive content
      apiKey: string;
    }
  ): Promise<NewsArticle[] | undefined> {
    // Default to excluding sensitive content
    const includeSensitiveContent = options.includeSensitiveContent ?? false;

    // Type guard: ensure the source is a string search query
    // This prevents runtime errors from invalid input types
    if (typeof searchQuery !== "string") {
      throw new Error("Source must be a string");
    }

    // Build the API request parameters
    // URLSearchParams automatically handles URL encoding and parameter formatting
    const params = new URLSearchParams();
    params.set("q", searchQuery); // Set the search query
    params.set("apiKey", options.apiKey); // Add authentication
    if (includeSensitiveContent) {
      params.set("sensitive", "true"); // Optional parameter for content filtering
    }

    // Construct the full API URL with all parameters
    // This creates a properly formatted URL for the HTTP request
    const url = `${this.baseUrl}/everything?${params.toString()}`;

    // Make the HTTP request to the news API
    // fetch() is the standard way to make HTTP requests in modern JavaScript
    const response = await fetch(url);

    // Check if the HTTP request was successful
    // HTTP status codes 200-299 indicate success
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse the JSON response from the API
    // This converts the raw response into a JavaScript object
    const data = await response.json();

    // Extract articles from the response and limit to first 10
    // This prevents overwhelming generators with too many articles
    // The ?. operator safely accesses nested properties
    return data.articles?.slice(0, 10) || [];
  }
}

/**
 * Data structure for news article information
 * This interface defines what data is collected from each news article
 *
 * Properties:
 * - title: Article headline for identification and content generation
 * - description: Article summary for content analysis
 * - url: Source URL for attribution and further reading
 * - publishedAt: Publication timestamp for temporal context
 *
 * Generators can use this structured data to:
 * - Create questions based on article content
 * - Generate summaries or key points
 * - Build timelines of events
 * - Create content based on current events
 *
 * Note: This is a simplified structure - real news APIs often provide
 * much more detailed information like author, category, image URLs, etc.
 */
interface NewsArticle {
  title: string; // Article headline (e.g., "Breaking News: Major Event")
  description: string; // Article summary or excerpt
  url: string; // Full URL to the original article
  publishedAt: string; // ISO timestamp of publication (e.g., "2024-01-15T10:30:00Z")
}
