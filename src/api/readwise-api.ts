import { ReadwiseClient } from './client';
import { 
  GetHighlightsParams, 
  GetBooksParams,
  SearchParams,
  PaginatedResponse,
  Highlight,
  Book,
  Document,
  SearchResult,
  TagResponse,
  DocumentTagsResponse,
  BulkTagRequest,
  BulkTagResponse
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

  /**
   * Get all tags from Readwise
   * @returns A promise resolving to a list of all tags
   */
  async getTags(): Promise<TagResponse> {
    return this.client.get<TagResponse>('/tags');
  }

  /**
   * Get tags for a specific document
   * @param documentId - The ID of the document
   * @returns A promise resolving to the document's tags
   */
  async getDocumentTags(documentId: string): Promise<DocumentTagsResponse> {
    return this.client.get<DocumentTagsResponse>(`/document/${documentId}/tags`);
  }

  /**
   * Update tags for a specific document
   * @param documentId - The ID of the document
   * @param tags - The new tags to set
   * @returns A promise resolving to the updated document tags
   */
  async updateDocumentTags(documentId: string, tags: string[]): Promise<DocumentTagsResponse> {
    return this.client.put<DocumentTagsResponse>(`/document/${documentId}/tags`, { tags });
  }

  /**
   * Add a tag to a document
   * @param documentId - The ID of the document
   * @param tag - The tag to add
   * @returns A promise resolving to the updated document tags
   */
  async addTagToDocument(documentId: string, tag: string): Promise<DocumentTagsResponse> {
    return this.client.post<DocumentTagsResponse>(`/document/${documentId}/tags/${encodeURIComponent(tag)}`);
  }

  /**
   * Remove a tag from a document
   * @param documentId - The ID of the document
   * @param tag - The tag to remove
   * @returns A promise resolving to the updated document tags
   */
  async removeTagFromDocument(documentId: string, tag: string): Promise<DocumentTagsResponse> {
    return this.client.delete<DocumentTagsResponse>(`/document/${documentId}/tags/${encodeURIComponent(tag)}`);
  }

  /**
   * Add tags to multiple documents
   * @param params - The bulk tag operation parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkTagDocuments(params: BulkTagRequest): Promise<BulkTagResponse> {
    return this.client.post<BulkTagResponse>('/bulk/tag', params);
  }
}
