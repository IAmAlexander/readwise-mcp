import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
 * Client for making requests to the Readwise API
 */
export class ReadwiseClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter | null = null;
  private enableRetry: boolean;
  private maxRetries: number;

  /**
   * Create a new ReadwiseClient
   * @param config - The client configuration
   */
  constructor(config: ExtendedClientConfig) {
    // Allow empty API key for lazy loading (authentication will be checked on first request)
    const apiKey = config.apiKey || '';

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

    // Build headers - only include Authorization if API key is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Token ${apiKey}`;
    }

    this.client = axios.create({
      // Use base URL without version - endpoints include /v2/ or /v3/ as needed
      baseURL: config.baseUrl || 'https://readwise.io/api',
      headers
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const status = error.response.status;
          const isAuthError = status === 401 || status === 403;
          
          return Promise.reject({
            type: isAuthError ? 'authentication' : 'api',
            details: {
              status,
              code: status === 429 
                ? 'rate_limit_exceeded' 
                : isAuthError 
                  ? 'authentication_required'
                  : 'api_error',
              message: isAuthError && !apiKey
                ? 'Readwise API key is required. Please provide your API key from https://readwise.io/access_token'
                : error.response.data?.detail || error.message
            }
          });
        } else if (error.request) {
          // The request was made but no response was received
          return Promise.reject({
            type: 'transport',
            details: {
              code: 'network_error',
              message: 'No response received from Readwise API'
            }
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          // Check if it's due to missing API key
          if (!apiKey && error.message?.includes('Authorization')) {
            return Promise.reject({
              type: 'authentication',
              details: {
                code: 'authentication_required',
                message: 'Readwise API key is required. Please provide your API key from https://readwise.io/access_token'
              }
            });
          }
          
          return Promise.reject({
            type: 'transport',
            details: {
              code: 'request_setup_error',
              message: error.message
            }
          });
        }
      }
    );
  }
  
  /**
   * Execute a request with rate limiting and optional retry
   */
  private async executeRequest<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
    // Acquire rate limit slot if enabled
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    // Execute with retry if enabled
    if (this.enableRetry) {
      const response = await withRetry(fn, {
        maxRetries: this.maxRetries,
        baseDelayMs: 1000,
        shouldRetry: (error: any) => {
          // Retry on rate limit (429) or server errors (5xx)
          const status = error?.details?.status;
          return status === 429 || (status >= 500 && status < 600);
        }
      });
      return response.data;
    }

    const response = await fn();
    return response.data;
  }

  /**
   * Make a GET request to the Readwise API
   * @param url - The URL to request
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>(() => this.client.get(url, config));
  }

  /**
   * Make a POST request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>(() => this.client.post(url, data, config));
  }

  /**
   * Make a PUT request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>(() => this.client.put(url, data, config));
  }

  /**
   * Make a PATCH request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>(() => this.client.patch(url, data, config));
  }

  /**
   * Make a DELETE request to the Readwise API
   * @param url - The URL to request
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>(() => this.client.delete(url, config));
  }
} 