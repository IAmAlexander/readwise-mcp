import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ClientConfig } from '../types/index.js';

/**
 * Client for making requests to the Readwise API
 */
export class ReadwiseClient {
  private client: AxiosInstance;
  
  /**
   * Create a new ReadwiseClient
   * @param config - The client configuration
   */
  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error('Readwise API key is required');
    }
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://readwise.io/api/v2',
      headers: {
        'Authorization': `Token ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          return Promise.reject({
            type: 'api',
            details: {
              status: error.response.status,
              code: error.response.status === 429 ? 'rate_limit_exceeded' : 'api_error',
              message: error.response.data?.detail || error.message
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
   * Make a GET request to the Readwise API
   * @param url - The URL to request
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }
  
  /**
   * Make a POST request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }
  
  /**
   * Make a PUT request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }
  
  /**
   * Make a PATCH request to the Readwise API
   * @param url - The URL to request
   * @param data - The data to send
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request to the Readwise API
   * @param url - The URL to request
   * @param config - Optional Axios request config
   * @returns The response data
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
} 