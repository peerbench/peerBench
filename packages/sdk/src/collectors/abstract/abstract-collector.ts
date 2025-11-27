export abstract class AbstractCollector<TOutput> {
  /**
   * String identifier of the collector.
   */
  abstract readonly identifier: string;

  /**
   * Collects data from a source
   * @param sourceUrl The URL or identifier of the source
   * @param options Additional options for collection (optional)
   * @returns Promise resolving to the collected data or null if failed
   */
  abstract collect(
    source: unknown,
    options?: Record<string, any>
  ): Promise<TOutput | undefined>;

  /**
   * Initializes the collector (depends on the implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(...args: any[]): Promise<void> {
    // Default implementation does nothing
    // Implement in subclasses if needed
  }
}
