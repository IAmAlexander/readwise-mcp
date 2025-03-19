import { ReadwiseClient } from './client';
import { 
  GetHighlightsParams, 
  GetBooksParams,
  SearchParams,
  PaginatedResponse,
  Highlight,
  Book,
  Document,
  SearchResult
} from '../types';

/**
 * API interface for interacting with Readwise
 */
export class ReadwiseAPI {
  /**
   * Create a new ReadwiseAPI
   * @param client - The ReadwiseClient instance to use
   */
  constructor(private client: ReadwiseClient) {}
  
  /**
   * Get highlights from Readwise
   * @param params - The parameters for the request
   * @returns A promise resolving to a paginated response of highlights
   */
  async getHighlights(params: GetHighlightsParams = {}): Promise<PaginatedResponse<Highlight>> {
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    if (params.book_id) {
      queryParams.append('book_id', params.book_id);
    }
    
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    if (params.search) {
      queryParams.append('search', params.search);
    }
    
    const queryString = queryParams.toString();
    const url = `/highlights${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<PaginatedResponse<Highlight>>(url);
  }
  
  /**
   * Get books from Readwise
   * @param params - The parameters for the request
   * @returns A promise resolving to a paginated response of books
   */
  async getBooks(params: GetBooksParams = {}): Promise<PaginatedResponse<Book>> {
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    if (params.category) {
      queryParams.append('category', params.category);
    }
    
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `/books${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<PaginatedResponse<Book>>(url);
  }
  
  /**
   * Get documents from Readwise
   * @param params - Optional pagination parameters
   * @returns A promise resolving to a paginated response of documents
   */
  async getDocuments(params: { page?: number, page_size?: number } = {}): Promise<PaginatedResponse<Document>> {
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `/documents${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<PaginatedResponse<Document>>(url);
  }
  
  /**
   * Search highlights in Readwise
   * @param params - The search parameters
   * @returns A promise resolving to search results
   */
  async searchHighlights(params: SearchParams): Promise<SearchResult[]> {
    if (!params.query) {
      throw {
        type: 'validation',
        details: [{
          field: 'query',
          message: 'Search query is required'
        }]
      };
    }
    
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    queryParams.append('query', params.query);
    
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const url = `/search?${queryParams.toString()}`;
    
    return this.client.get<SearchResult[]>(url);
  }
}
