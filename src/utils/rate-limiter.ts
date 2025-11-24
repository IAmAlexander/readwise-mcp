/**
 * Simple rate limiter with queue and exponential backoff
 */

export interface RateLimiterOptions {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Minimum delay between requests in milliseconds */
  minDelayMs?: number;
}

/**
 * Simple rate limiter to prevent hitting API rate limits
 */
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private queue: Array<() => void> = [];
  private processing = false;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly minDelayMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.minDelayMs = options.minDelayMs ?? 100;
  }

  /**
   * Wait until a request slot is available
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process the queue of waiting requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      await this.waitForSlot();
      const resolve = this.queue.shift();
      if (resolve) {
        this.requestTimestamps.push(Date.now());
        resolve();
      }

      // Add minimum delay between requests
      if (this.queue.length > 0) {
        await this.delay(this.minDelayMs);
      }
    }

    this.processing = false;
  }

  /**
   * Wait until a request slot is available within the rate limit window
   */
  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > windowStart);

    // If we're at the limit, wait until the oldest request expires
    if (this.requestTimestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = oldestTimestamp + this.windowMs - now + 10; // +10ms buffer
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }
  }

  /**
   * Delay for a specified number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get requests made in current window (for monitoring)
   */
  getCurrentWindowRequests(): number {
    const windowStart = Date.now() - this.windowMs;
    return this.requestTimestamps.filter(ts => ts > windowStart).length;
  }
}

/**
 * Exponential backoff helper for retrying failed requests
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = () => true
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
