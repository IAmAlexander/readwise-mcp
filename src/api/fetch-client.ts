/**
 * Fetch-based HTTP client for Cloudflare Workers compatibility
 *
 * This client uses the native Fetch API instead of axios to avoid
 * Node.js built-in module dependencies that don't work in Cloudflare Workers.
 */
import { ClientConfig } from '../types/index.js';
import { RateLimiter, withRetry } from '../utils/rate-limiter.js';

/**
 * Extended client configuration with rate limiting options
 */
export interface ExtendedClientConfig extends ClientConfig {
  /** Enable rate limiting (default: true) */
  enableRateLimiting?: boolean;
  /** Maximum requests per minute (default: 60) */
  maxRequestsPerMinute?: number;
  /** Enable automatic retry with exponential backoff (default: true) */
  enableRetry?: boolean;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
}

/**
 * Custom error class for API errors
 * Extends Error so it can be properly caught and serialized
 */
export class APIClientError extends Error {
  type: 'authentication' | 'api' | 'transport';
  status?: number;
  code: string;

  constructor(
    type: 'authentication' | 'api' | 'transport',
    message: string,
    code: string,
    status?: number
  ) {
    super(message);
    this.name = 'APIClientError';
    this.type = type;
    this.code = code;
    this.status = status;
  }
}

/**
 * Fetch-based client for making requests to the Readwise API
 * Compatible with Cloudflare Workers (no Node.js dependencies)
 */
export class FetchClient {
  private baseURL: string;
  private apiKey: string;
  private rateLimiter: RateLimiter | null = null;
  private enableRetry: boolean;
  private maxRetries: number;

  /**
   * Create a new FetchClient
   * @param config - The client configuration
   */
  constructor(config: ExtendedClientConfig) {
    // Allow empty API key for lazy loading (authentication will be checked on first request)
    this.apiKey = config.apiKey || '';
    this.baseURL = config.baseUrl || 'https://readwise.io/api/v2';

    // Set up rate limiting (default: enabled with 60 requests/minute)
    const enableRateLimiting = config.enableRateLimiting !== false;
    if (enableRateLimiting) {
      this.rateLimiter = new RateLimiter({
        maxRequests: config.maxRequestsPerMinute ?? 60,
        windowMs: 60 * 1000, // 1 minute
        minDelayMs: 100
      });
    }

    // Set up retry configuration
    this.enableRetry = config.enableRetry !== false;
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Build headers for the request
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Token ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Handle response errors and throw APIClientError
   */
  private async handleError(response: Response): Promise<never> {
    const status = response.status;
    const isAuthError = status === 401 || status === 403;

    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.detail || errorData?.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }

    const type = isAuthError ? 'authentication' : 'api';
    const code = status === 429
      ? 'rate_limit_exceeded'
      : isAuthError
        ? 'authentication_required'
        : 'api_error';
    const message = isAuthError && !this.apiKey
      ? 'Readwise API key is required. Please provide your API key from https://readwise.io/access_token'
      : `API Error (${status}): ${errorMessage}`;

    throw new APIClientError(type, message, code, status);
  }

  /**
   * Execute a request with rate limiting and optional retry
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    // Acquire rate limit slot if enabled
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    const fullURL = `${this.baseURL}${url}`;
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.buildHeaders(),
        ...(options.headers || {})
      }
    };

    const makeRequest = async (): Promise<T> => {
      const response = await fetch(fullURL, requestOptions);

      if (!response.ok) {
        await this.handleError(response);
      }

      // Handle empty responses (like DELETE operations)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Return empty object for non-JSON responses
        return {} as T;
      }

      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    };

    // Execute with retry if enabled
    if (this.enableRetry) {
      return withRetry(makeRequest, {
        maxRetries: this.maxRetries,
        baseDelayMs: 1000,
        shouldRetry: (error: any) => {
          // Retry on rate limit (429) or server errors (5xx)
          const status = error?.details?.status;
          return status === 429 || (status >= 500 && status < 600);
        }
      });
    }

    return makeRequest();
  }

  /**
   * Make a GET request to the Readwise API
   * @param url - The URL to request
   * @param _config - Optional config (for API compatibility, not used)
   * @returns The response data
   */
  async get<T>(url: string, _config?: unknown): Promise<T> {
    return this.executeRequest<T>(url, { method: 'GET' });
  }

  /**
   * Make a POST request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param _config - Optional config (for API compatibility, not used)
   * @returns The response data
   */
  async post<T>(url: string, data?: unknown, _config?: unknown): Promise<T> {
    return this.executeRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Make a PUT request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param _config - Optional config (for API compatibility, not used)
   * @returns The response data
   */
  async put<T>(url: string, data?: unknown, _config?: unknown): Promise<T> {
    return this.executeRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Make a PATCH request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param _config - Optional config (for API compatibility, not used)
   * @returns The response data
   */
  async patch<T>(url: string, data?: unknown, _config?: unknown): Promise<T> {
    return this.executeRequest<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Make a DELETE request to the Readwise API
   * @param url - The URL to request
   * @param _config - Optional config (for API compatibility, not used)
   * @returns The response data
   */
  async delete<T>(url: string, _config?: unknown): Promise<T> {
    return this.executeRequest<T>(url, { method: 'DELETE' });
  }
}
