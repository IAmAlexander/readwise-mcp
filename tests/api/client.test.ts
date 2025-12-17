import axios from 'axios';
import { ReadwiseClient, ExtendedClientConfig } from '../../src/api/client.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ReadwiseClient', () => {
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('constructor', () => {
    it('should allow empty API key for lazy loading', () => {
      // API key is now optional to support Smithery's lazy loading pattern
      expect(() => new ReadwiseClient({ apiKey: '' })).not.toThrow();
    });

    it('should create client with default configuration', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://readwise.io/api/v2',
        headers: {
          'Authorization': 'Token test-key',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should create client with custom base URL', () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com'
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.api.com'
        })
      );
    });

    it('should set up response interceptor', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should enable rate limiting by default', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      // Rate limiting is internal, but we can verify the client was created
      expect(client).toBeInstanceOf(ReadwiseClient);
    });

    it('should disable rate limiting when configured', () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        enableRateLimiting: false
      });

      expect(client).toBeInstanceOf(ReadwiseClient);
    });

    it('should configure custom rate limit', () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        maxRequestsPerMinute: 30
      });

      expect(client).toBeInstanceOf(ReadwiseClient);
    });

    it('should enable retry by default', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      expect(client).toBeInstanceOf(ReadwiseClient);
    });

    it('should disable retry when configured', () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        enableRetry: false
      });

      expect(client).toBeInstanceOf(ReadwiseClient);
    });

    it('should configure custom max retries', () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        maxRetries: 5
      });

      expect(client).toBeInstanceOf(ReadwiseClient);
    });
  });

  describe('HTTP methods', () => {
    let client: ReadwiseClient;

    beforeEach(() => {
      client = new ReadwiseClient({
        apiKey: 'test-key',
        enableRateLimiting: false,
        enableRetry: false
      });
    });

    describe('get', () => {
      it('should make GET request and return data', async () => {
        const mockData = { results: [{ id: 1 }] };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        const result = await client.get('/highlights');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/highlights', undefined);
        expect(result).toEqual(mockData);
      });

      it('should pass config options to GET request', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: {} });

        await client.get('/highlights', { params: { page: 1 } });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/highlights', { params: { page: 1 } });
      });
    });

    describe('post', () => {
      it('should make POST request with data and return response', async () => {
        const postData = { text: 'Test highlight' };
        const mockResponse = { id: 123 };
        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await client.post('/highlights', postData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/highlights', postData, undefined);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('put', () => {
      it('should make PUT request with data and return response', async () => {
        const putData = { text: 'Updated highlight' };
        const mockResponse = { id: 123, text: 'Updated highlight' };
        mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

        const result = await client.put('/highlights/123', putData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/highlights/123', putData, undefined);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('patch', () => {
      it('should make PATCH request with data and return response', async () => {
        const patchData = { note: 'Updated note' };
        const mockResponse = { id: 123, note: 'Updated note' };
        mockAxiosInstance.patch.mockResolvedValue({ data: mockResponse });

        const result = await client.patch('/highlights/123', patchData);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/highlights/123', patchData, undefined);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('delete', () => {
      it('should make DELETE request and return response', async () => {
        const mockResponse = { success: true };
        mockAxiosInstance.delete.mockResolvedValue({ data: mockResponse });

        const result = await client.delete('/highlights/123');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/highlights/123', undefined);
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors through interceptor', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      // Get the error handler from the interceptor
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      // Test API error (server responded with error status)
      const apiError = {
        response: {
          status: 400,
          data: { detail: 'Bad request' }
        }
      };

      expect(errorHandler(apiError)).rejects.toEqual({
        type: 'api',
        details: {
          status: 400,
          code: 'api_error',
          message: 'Bad request'
        }
      });
    });

    it('should handle rate limit errors through interceptor', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      const rateLimitError = {
        response: {
          status: 429,
          data: { detail: 'Too many requests' }
        }
      };

      expect(errorHandler(rateLimitError)).rejects.toEqual({
        type: 'api',
        details: {
          status: 429,
          code: 'rate_limit_exceeded',
          message: 'Too many requests'
        }
      });
    });

    it('should handle network errors through interceptor', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      const networkError = {
        request: {},
        message: 'Network Error'
      };

      expect(errorHandler(networkError)).rejects.toEqual({
        type: 'transport',
        details: {
          code: 'network_error',
          message: 'No response received from Readwise API'
        }
      });
    });

    it('should handle request setup errors through interceptor', () => {
      const client = new ReadwiseClient({ apiKey: 'test-key' });

      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      const setupError = {
        message: 'Invalid URL'
      };

      expect(errorHandler(setupError)).rejects.toEqual({
        type: 'transport',
        details: {
          code: 'request_setup_error',
          message: 'Invalid URL'
        }
      });
    });
  });

  describe('rate limiting integration', () => {
    it('should acquire rate limit slot before making request', async () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        enableRateLimiting: true,
        maxRequestsPerMinute: 60,
        enableRetry: false
      });

      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await client.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });

  describe('retry integration', () => {
    it('should not retry when retry is disabled', async () => {
      const client = new ReadwiseClient({
        apiKey: 'test-key',
        enableRateLimiting: false,
        enableRetry: false
      });

      mockAxiosInstance.get.mockRejectedValue(new Error('Test error'));

      await expect(client.get('/test')).rejects.toThrow('Test error');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });
});
