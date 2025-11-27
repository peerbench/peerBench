import { sleep } from "./sleep";

export interface RateLimiterOptions {
  /**
   * Maximum weight of calls allowed within a time window. Each call has a weight of 1 by default.
   * Rate limiting is disabled when this is 0 or negative.
   * @default 25
   */
  maxWeight?: number;

  /**
   * Time window in milliseconds for rate limiting
   * @default 1000
   */
  timeWindow?: number;
}

export interface RateLimiterCallOptions {
  /**
   * Weight of the call. Rate limiting is applied based on the total weight of the calls.
   * @default 1
   */
  weight?: number;

  /**
   * Abort signal for cancellation
   */
  signal?: AbortSignal;
}

/**
 * Generic rate limiter. It can be used to limit async function calls
 * by a given number of calls within a time window.
 */
export class RateLimiter {
  maxWeight: number;
  timeWindow: number;

  private timestamps: number[] = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxWeight = options.maxWeight ?? 25;
    this.timeWindow = options.timeWindow ?? 1000;
  }

  /**
   * Checks if rate limiting is disabled
   */
  isDisabled(): boolean {
    return this.maxWeight <= 0;
  }

  /**
   * Disables rate limiting. Set `maxWeight` to re-enable it.
   */
  disable() {
    this.maxWeight = 0;
  }

  /**
   * Returns how many weight of calls are there in the current time window
   */
  getCurrentCalls(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.timeWindow
    );
    return this.timestamps.length;
  }

  /**
   * Executes the given function with rate limiting applied
   */
  async execute<T = unknown>(
    func: () => Promise<T>,
    { weight = 1, signal }: RateLimiterCallOptions = {}
  ): Promise<T> {
    // If maxWeight is zero/negative, execute immediately (no rate limiting)
    if (this.maxWeight <= 0) {
      return await func();
    }

    await this.waitForRateLimit(weight, signal);
    return await func();
  }

  /**
   * Waits until rate limit allows the specified weight of calls
   */
  private async waitForRateLimit(
    weight: number,
    signal?: AbortSignal
  ): Promise<void> {
    const now = Date.now();

    // Clear timestamps from the old time period
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.timeWindow
    );

    // Check if there are empty slots for the requests
    if (this.timestamps.length + weight <= this.maxWeight) {
      for (let i = 0; i < weight; i++) {
        this.timestamps.push(now);
      }
      return;
    }

    // Calculate how much time to wait for the next time window
    const earliest = this.timestamps[0];
    const waitTime = this.timeWindow - (now - earliest);

    await sleep(waitTime, signal);

    // Retry after waiting
    return this.waitForRateLimit(weight, signal);
  }

  /**
   * Resets the rate limited weight of calls
   */
  reset(): void {
    this.timestamps = [];
  }
}
