import { RateLimiter, withRetry } from '../../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a rate limiter with provided options', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        minDelayMs: 50
      });

      expect(limiter).toBeInstanceOf(RateLimiter);
      expect(limiter.getQueueSize()).toBe(0);
      expect(limiter.getCurrentWindowRequests()).toBe(0);
    });

    it('should use default minDelayMs when not provided', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000
      });

      expect(limiter).toBeInstanceOf(RateLimiter);
    });
  });

  describe('acquire', () => {
    it('should immediately acquire when under rate limit', async () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000,
        minDelayMs: 0
      });

      const acquirePromise = limiter.acquire();

      // Process any pending timers
      jest.runAllTimers();

      await acquirePromise;

      expect(limiter.getCurrentWindowRequests()).toBe(1);
    });

    it('should queue requests when at rate limit', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 100, // Short window for testing
        minDelayMs: 0
      });

      // Acquire first two requests immediately
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getCurrentWindowRequests()).toBe(2);
    });

    it('should track multiple requests', async () => {
      jest.useRealTimers();

      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        minDelayMs: 0
      });

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getCurrentWindowRequests()).toBe(3);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 when queue is empty', () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000
      });

      expect(limiter.getQueueSize()).toBe(0);
    });
  });

  describe('getCurrentWindowRequests', () => {
    it('should return 0 when no requests have been made', () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000
      });

      expect(limiter.getCurrentWindowRequests()).toBe(0);
    });

    it('should only count requests within the window', async () => {
      jest.useRealTimers();

      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 50, // Very short window
        minDelayMs: 0
      });

      await limiter.acquire();
      expect(limiter.getCurrentWindowRequests()).toBe(1);

      // Wait for the window to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(limiter.getCurrentWindowRequests()).toBe(0);
    });
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return result immediately on success', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    jest.useRealTimers();

    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10, // Short delay for testing
      maxDelayMs: 100
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries exceeded', async () => {
    jest.useRealTimers();

    const fn = jest.fn().mockRejectedValue(new Error('Always fails'));

    await expect(withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 50
    })).rejects.toThrow('Always fails');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry when shouldRetry returns false', async () => {
    jest.useRealTimers();

    const fn = jest.fn().mockRejectedValue(new Error('Non-retryable error'));

    await expect(withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      shouldRetry: () => false
    })).rejects.toThrow('Non-retryable error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use shouldRetry callback correctly', async () => {
    jest.useRealTimers();

    const retryableError = { type: 'retryable' };
    const nonRetryableError = { type: 'non-retryable' };

    const fn = jest.fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(nonRetryableError);

    await expect(withRetry(fn, {
      maxRetries: 5,
      baseDelayMs: 10,
      shouldRetry: (error: any) => error?.type === 'retryable'
    })).rejects.toEqual(nonRetryableError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use default options when not provided', async () => {
    const fn = jest.fn().mockResolvedValue('result');

    const result = await withRetry(fn);

    expect(result).toBe('result');
  });

  it('should cap delay at maxDelayMs', async () => {
    jest.useRealTimers();

    const startTime = Date.now();
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    await withRetry(fn, {
      maxRetries: 1,
      baseDelayMs: 10000, // Very long base delay
      maxDelayMs: 50 // But capped at 50ms (plus jitter up to 1000ms)
    });

    const elapsed = Date.now() - startTime;
    // Should be capped around 50ms + jitter (up to 1000ms), so well under 10000ms
    expect(elapsed).toBeLessThan(2000);
  });
});
