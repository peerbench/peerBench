import { sleep } from "./sleep";

export interface RateLimiterOptions {
  maxWeight?: number;
  timeWindow?: number;
}

export interface RateLimiterCallOptions {
  weight?: number;
  signal?: AbortSignal;
}

export class RateLimiter {
  maxWeight: number;
  timeWindow: number;
  private timestamps: number[] = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxWeight = options.maxWeight ?? 25;
    this.timeWindow = options.timeWindow ?? 1000;
  }

  isDisabled(): boolean {
    return this.maxWeight <= 0;
  }

  disable() {
    this.maxWeight = 0;
  }

  getCurrentCalls(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.timeWindow,
    );
    return this.timestamps.length;
  }

  async execute<T = unknown>(
    func: () => Promise<T>,
    { weight = 1, signal }: RateLimiterCallOptions = {},
  ): Promise<T> {
    if (this.maxWeight <= 0) {
      return await func();
    }
    await this.waitForRateLimit(weight, signal);
    return await func();
  }

  private async waitForRateLimit(
    weight: number,
    signal?: AbortSignal,
  ): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.timeWindow,
    );

    if (this.timestamps.length + weight <= this.maxWeight) {
      for (let i = 0; i < weight; i++) {
        this.timestamps.push(now);
      }
      return;
    }

    const earliest = this.timestamps[0];
    const waitTime = this.timeWindow - (now - (earliest ?? 0));
    await sleep(waitTime, signal);
    return this.waitForRateLimit(weight, signal);
  }

  reset(): void {
    this.timestamps = [];
  }
}
