/**
 * Abstract class for Providers.
 *
 * A Provider is the entity that is responsible for forwarding the given inputs
 * to the target entity (LLM, API, ML model etc.) and collecting its output.
 */
export abstract class AbstractProvider<TInput, TOutput> {
  /**
   * Unique identifier of the Provider.
   */
  static readonly identifier: string = "abstract";

  /**
   * Forwards the given input to the Provider and returns the response.
   *
   * @example
   * ```ts
   * const provider = new ImageGenerationProvider();
   *
   * // Input and the options are provider specific.
   * // In this example we are using a Provider that generates images from text inputs.
   * const response = await provider.forward("A beautiful sunset over a calm ocean", {
   *   width: 1024,
   *   height: 1024,
   * });
   *
   * // Write the generated image to a file
   * await fs.writeFile("response.png", response.data);
   * ```
   */
  abstract forward(
    input: TInput,
    options?: any
  ): Promise<ProviderResponse<TOutput>>;

  /**
   * Returns the unique identifier of the Provider.
   */
  getIdentifier(): string | undefined {
    // Static identifier or instance identifier
    return (this.constructor as any)?.identifier || (this as any)?.identifier;
  }
}

/**
 * Type of the response returned by the Provider.
 */
export type ProviderResponse<TData = Uint8Array> = {
  /**
   * The time that was the request sent to the target entity.
   */
  startedAt: Date;

  /**
   * The time that was the response received from the target entity.
   */
  completedAt: Date;

  /**
   * The response data.
   */
  data: TData;
};
