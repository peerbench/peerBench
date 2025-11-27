/**
 * Abstract class for Providers.
 *
 * A Provider is the entity that is responsible for forwarding the given inputs
 * to the underlying infrastructure (e.g LLM, API, image generation model) and
 * collecting its response as a byte array.
 */
export abstract class AbstractProvider<TInput, TOutput> {
  /**
   * Unique identifier of the Provider.
   */
  abstract readonly identifier: string;

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
}

/**
 * Type of the response returned by the Provider.
 */
export type ProviderResponse<TData = Uint8Array> = {
  /**
   * The date and time when the response was started.
   */
  startedAt: Date;

  /**
   * The date and time when the response was completed.
   */
  completedAt: Date;

  /**
   * The response data.
   */
  data: TData;
};
