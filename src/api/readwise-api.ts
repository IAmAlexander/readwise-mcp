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
  BulkTagResponse,
  GetReadingProgressParams,
  UpdateReadingProgressParams,
  ReadingProgress,
  GetReadingListParams,
  ReadingListResponse,
  CreateHighlightParams,
  UpdateHighlightParams,
  DeleteHighlightParams,
  CreateNoteParams,
  UpdateNoteParams,
  DeleteNoteParams,
  AdvancedSearchParams,
  AdvancedSearchResult,
  SearchByTagParams,
  SearchByDateParams
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

  /**
   * Get reading progress for a document
   * @param params - The parameters for the request
   * @returns A promise resolving to the reading progress
   */
  async getReadingProgress(params: GetReadingProgressParams): Promise<ReadingProgress> {
    const response = await this.client.get<Document>(`/document/${params.document_id}/progress`);
    const metadata = response.user_metadata || {};
    
    return {
      document_id: params.document_id,
      title: response.title,
      status: metadata.reading_status || 'not_started',
      percentage: metadata.reading_percentage || 0,
      current_page: metadata.current_page,
      total_pages: metadata.total_pages,
      last_read_at: metadata.last_read_at
    };
  }

  /**
   * Update reading progress for a document
   * @param params - The parameters for the request
   * @returns A promise resolving to the updated reading progress
   */
  async updateReadingProgress(params: UpdateReadingProgressParams): Promise<ReadingProgress> {
    const response = await this.client.put<Document>(`/document/${params.document_id}/progress`, params);
    const metadata = response.user_metadata || {};
    
    return {
      document_id: params.document_id,
      title: response.title,
      status: metadata.reading_status || 'not_started',
      percentage: metadata.reading_percentage || 0,
      current_page: metadata.current_page,
      total_pages: metadata.total_pages,
      last_read_at: metadata.last_read_at
    };
  }

  /**
   * Get reading list with progress information
   * @param params - The parameters for the request
   * @returns A promise resolving to a paginated response of documents with reading progress
   */
  async getReadingList(params: GetReadingListParams = {}): Promise<ReadingListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.status) {
      queryParams.append('status', params.status);
    }
    
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
    const url = `/reading-list${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<ReadingListResponse>(url);
  }

  /**
   * Create a new highlight
   * @param params - The parameters for creating the highlight
   * @returns A promise resolving to the created highlight
   */
  async createHighlight(params: CreateHighlightParams): Promise<Highlight> {
    return this.client.post<Highlight>('/highlights', params);
  }

  /**
   * Update an existing highlight
   * @param params - The parameters for updating the highlight
   * @returns A promise resolving to the updated highlight
   */
  async updateHighlight(params: UpdateHighlightParams): Promise<Highlight> {
    return this.client.put<Highlight>(`/highlights/${params.highlight_id}`, params);
  }

  /**
   * Delete a highlight
   * @param params - The parameters for deleting the highlight
   * @returns A promise resolving to the deletion result
   */
  async deleteHighlight(params: DeleteHighlightParams): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/highlights/${params.highlight_id}`);
  }

  /**
   * Create a note for a highlight
   * @param params - The parameters for creating the note
   * @returns A promise resolving to the updated highlight
   */
  async createNote(params: CreateNoteParams): Promise<Highlight> {
    return this.client.post<Highlight>(`/highlights/${params.highlight_id}/notes`, { note: params.note });
  }

  /**
   * Update a note for a highlight
   * @param params - The parameters for updating the note
   * @returns A promise resolving to the updated highlight
   */
  async updateNote(params: UpdateNoteParams): Promise<Highlight> {
    return this.client.put<Highlight>(`/highlights/${params.highlight_id}/notes`, { note: params.note });
  }

  /**
   * Delete a note from a highlight
   * @param params - The parameters for deleting the note
   * @returns A promise resolving to the updated highlight
   */
  async deleteNote(params: DeleteNoteParams): Promise<Highlight> {
    return this.client.delete<Highlight>(`/highlights/${params.highlight_id}/notes`);
  }

  /**
   * Advanced search for highlights with multiple filters and facets
   * @param params - The advanced search parameters
   * @returns A promise resolving to the search results with facets
   */
  async advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResult> {
    const queryParams = new URLSearchParams();
    
    // Add basic parameters
    if (params.query) {
      queryParams.append('query', params.query);
    }
    
    if (params.book_ids?.length) {
      params.book_ids.forEach(id => queryParams.append('book_id', id));
    }
    
    if (params.tags?.length) {
      params.tags.forEach(tag => queryParams.append('tag', tag));
    }
    
    if (params.categories?.length) {
      params.categories.forEach(category => queryParams.append('category', category));
    }
    
    // Add date range parameters
    if (params.date_range?.start) {
      queryParams.append('start_date', params.date_range.start);
    }
    
    if (params.date_range?.end) {
      queryParams.append('end_date', params.date_range.end);
    }
    
    // Add location range parameters
    if (params.location_range?.start !== undefined) {
      queryParams.append('location_start', params.location_range.start.toString());
    }
    
    if (params.location_range?.end !== undefined) {
      queryParams.append('location_end', params.location_range.end.toString());
    }
    
    // Add note filter
    if (params.has_note !== undefined) {
      queryParams.append('has_note', params.has_note.toString());
    }
    
    // Add sorting parameters
    if (params.sort_by) {
      queryParams.append('sort_by', params.sort_by);
    }
    
    if (params.sort_order) {
      queryParams.append('sort_order', params.sort_order);
    }
    
    // Add pagination parameters
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    // Add facets request
    queryParams.append('include_facets', 'true');
    
    const url = `/search/advanced?${queryParams.toString()}`;
    
    return this.client.get<AdvancedSearchResult>(url);
  }

  /**
   * Search highlights by tags
   * @param params - The tag search parameters
   * @returns A promise resolving to a paginated response of highlights
   */
  async searchByTags(params: SearchByTagParams): Promise<PaginatedResponse<Highlight>> {
    const queryParams = new URLSearchParams();
    
    // Add tags parameters
    params.tags.forEach(tag => queryParams.append('tag', tag));
    
    if (params.match_all !== undefined) {
      queryParams.append('match_all', params.match_all.toString());
    }
    
    // Add pagination parameters
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    const url = `/search/tags?${queryParams.toString()}`;
    
    return this.client.get<PaginatedResponse<Highlight>>(url);
  }

  /**
   * Search highlights by date range
   * @param params - The date search parameters
   * @returns A promise resolving to a paginated response of highlights
   */
  async searchByDate(params: SearchByDateParams): Promise<PaginatedResponse<Highlight>> {
    const queryParams = new URLSearchParams();
    
    if (params.start_date) {
      queryParams.append('start_date', params.start_date);
    }
    
    if (params.end_date) {
      queryParams.append('end_date', params.end_date);
    }
    
    if (params.date_field) {
      queryParams.append('date_field', params.date_field);
    }
    
    // Add pagination parameters
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    const url = `/search/date?${queryParams.toString()}`;
    
    return this.client.get<PaginatedResponse<Highlight>>(url);
  }
}
