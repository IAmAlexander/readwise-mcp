import { ReadwiseClient } from './client.js';
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
  SearchByDateParams,
  GetVideosParams,
  VideoResponse,
  VideoDetailsResponse,
  CreateVideoHighlightParams,
  VideoHighlight,
  VideoHighlightsResponse,
  UpdateVideoPositionParams,
  VideoPlaybackPosition,
  SaveDocumentParams,
  SaveDocumentResponse,
  UpdateDocumentParams,
  DeleteDocumentParams,
  DeleteDocumentResponse,
  BulkSaveDocumentsParams,
  BulkUpdateDocumentsParams,
  BulkDeleteDocumentsParams,
  BulkOperationResult,
  GetRecentContentParams,
  RecentContentResponse
} from '../types/index.js';

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
    const document = await this.client.get<Document>(`/document/${params.document_id}/progress`);
    const metadata = document.user_metadata || {};
    
    return {
      document_id: params.document_id,
      title: document.title,
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
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.date_field) queryParams.append('date_field', params.date_field);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    return this.client.get<PaginatedResponse<Highlight>>(`/highlights/search/date?${queryParams}`);
  }

  // Video-related methods
  async getVideos(params?: GetVideosParams): Promise<VideoResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    if (params?.pageCursor) {
      queryParams.append('page_cursor', params.pageCursor);
    }
    
    if (params?.tags?.length) {
      queryParams.append('tags', params.tags.join(','));
    }
    
    if (params?.platform) {
      queryParams.append('platform', params.platform);
    }
    
    const response = await this.client.get<VideoResponse>(`/videos?${queryParams}`);
    return response;
  }

  async getVideo(document_id: string): Promise<VideoDetailsResponse> {
    const response = await this.client.get<VideoDetailsResponse>(`/video/${document_id}`);
    return response;
  }

  async createVideoHighlight(params: CreateVideoHighlightParams): Promise<VideoHighlight> {
    const response = await this.client.post<VideoHighlight>(`/video/${params.document_id}/highlight`, {
      text: params.text,
      timestamp: params.timestamp,
      note: params.note
    });
    return response;
  }

  async getVideoHighlights(document_id: string): Promise<VideoHighlightsResponse> {
    const response = await this.client.get<VideoHighlightsResponse>(`/video/${document_id}/highlights`);
    return response;
  }

  async updateVideoPosition(params: UpdateVideoPositionParams): Promise<VideoPlaybackPosition> {
    const response = await this.client.post<VideoPlaybackPosition>(`/video/${params.document_id}/position`, {
      position: params.position,
      duration: params.duration
    });
    return response;
  }

  async getVideoPosition(document_id: string): Promise<VideoPlaybackPosition> {
    const response = await this.client.get<VideoPlaybackPosition>(`/video/${document_id}/position`);
    return response;
  }

  /**
   * Save a new document to Readwise
   * @param params - The parameters for saving the document
   * @returns A promise resolving to the saved document
   */
  async saveDocument(params: SaveDocumentParams): Promise<SaveDocumentResponse> {
    if (!params.url) {
      throw {
        type: 'validation',
        details: [{
          field: 'url',
          message: 'URL is required'
        }]
      };
    }

    const payload: any = {
      url: params.url,
      saved_using: 'readwise-mcp'
    };

    // Add optional parameters if they exist
    if (params.title) payload.title = params.title;
    if (params.author) payload.author = params.author;
    if (params.html) payload.html = params.html;
    if (params.tags) payload.tags = params.tags;
    if (params.summary) payload.summary = params.summary;
    if (params.notes) payload.notes = params.notes;
    if (params.location) payload.location = params.location;
    if (params.category) payload.category = params.category;
    if (params.published_date) payload.published_date = params.published_date;
    if (params.image_url) payload.image_url = params.image_url;

    // Note: Using v3 API endpoint for saving documents
    const response = await this.client.post<SaveDocumentResponse>('/v3/save/', payload);
    return response;
  }

  /**
   * Update an existing document's metadata
   * @param params - The parameters for updating the document
   * @returns A promise resolving to the updated document
   */
  async updateDocument(params: UpdateDocumentParams): Promise<Document> {
    if (!params.document_id) {
      throw {
        type: 'validation',
        details: [{
          field: 'document_id',
          message: 'Document ID is required'
        }]
      };
    }

    // Prepare the request payload with only the fields that are provided
    const payload: any = {};
    if (params.title !== undefined) payload.title = params.title;
    if (params.author !== undefined) payload.author = params.author;
    if (params.summary !== undefined) payload.summary = params.summary;
    if (params.published_date !== undefined) payload.published_date = params.published_date;
    if (params.image_url !== undefined) payload.image_url = params.image_url;
    if (params.location !== undefined) payload.location = params.location;
    if (params.category !== undefined) payload.category = params.category;
    if (params.tags !== undefined) payload.tags = params.tags;

    // If no fields to update were provided
    if (Object.keys(payload).length === 0) {
      throw {
        type: 'validation',
        details: [{
          field: 'payload',
          message: 'No update fields provided'
        }]
      };
    }

    // Note: Using v3 API endpoint for updating documents
    const response = await this.client.patch<Document>(`/v3/update/${params.document_id}/`, payload);
    return response;
  }

  /**
   * Delete a document from Readwise
   * @param params - The parameters for deleting the document
   * @returns A promise resolving to the deletion result
   */
  async deleteDocument(params: DeleteDocumentParams): Promise<DeleteDocumentResponse> {
    if (!params.document_id) {
      throw {
        type: 'validation',
        details: [{
          field: 'document_id',
          message: 'Document ID is required'
        }]
      };
    }

    // Check for confirmation
    const requiredConfirmation = 'I confirm deletion';
    if (!params.confirmation || params.confirmation !== requiredConfirmation) {
      throw {
        type: 'validation',
        details: [{
          field: 'confirmation',
          message: `Confirmation required. Must be "${requiredConfirmation}" to confirm deletion.`
        }]
      };
    }

    // Note: Using v3 API endpoint for deleting documents
    await this.client.delete(`/v3/delete/${params.document_id}/`);

    return {
      success: true,
      document_id: params.document_id
    };
  }

  /**
   * Save multiple documents in bulk
   * @param params - The bulk save parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkSaveDocuments(params: BulkSaveDocumentsParams): Promise<BulkOperationResult> {
    if (!Array.isArray(params.items) || params.items.length === 0) {
      throw {
        type: 'validation',
        details: [{
          field: 'items',
          message: 'Items array is required and must not be empty'
        }]
      };
    }

    // Check for confirmation
    const requiredConfirmation = 'I confirm saving these items';
    if (!params.confirmation || params.confirmation !== requiredConfirmation) {
      throw {
        type: 'validation',
        details: [{
          field: 'confirmation',
          message: `Confirmation required. Must be "${requiredConfirmation}" to proceed.`
        }]
      };
    }

    // Process each item
    const results = await Promise.all(
      params.items.map(async (item) => {
        try {
          const response = await this.saveDocument(item);
          return {
            success: true,
            document_id: response.id,
            url: item.url
          };
        } catch (error: any) {
          return {
            success: false,
            url: item.url,
            error: error.message || 'Failed to save item'
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Update multiple documents in bulk
   * @param params - The bulk update parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkUpdateDocuments(params: BulkUpdateDocumentsParams): Promise<BulkOperationResult> {
    if (!Array.isArray(params.updates) || params.updates.length === 0) {
      throw {
        type: 'validation',
        details: [{
          field: 'updates',
          message: 'Updates array is required and must not be empty'
        }]
      };
    }

    // Check for confirmation
    const requiredConfirmation = 'I confirm these updates';
    if (!params.confirmation || params.confirmation !== requiredConfirmation) {
      throw {
        type: 'validation',
        details: [{
          field: 'confirmation',
          message: `Confirmation required. Must be "${requiredConfirmation}" to proceed.`
        }]
      };
    }

    // Process each update
    const results = await Promise.all(
      params.updates.map(async (update) => {
        try {
          const response = await this.updateDocument(update);
          return {
            success: true,
            document_id: update.document_id
          };
        } catch (error: any) {
          return {
            success: false,
            document_id: update.document_id,
            error: error.message || 'Failed to update document'
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Delete multiple documents in bulk
   * @param params - The bulk delete parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkDeleteDocuments(params: BulkDeleteDocumentsParams): Promise<BulkOperationResult> {
    if (!Array.isArray(params.document_ids) || params.document_ids.length === 0) {
      throw {
        type: 'validation',
        details: [{
          field: 'document_ids',
          message: 'Document IDs array is required and must not be empty'
        }]
      };
    }

    // Check for confirmation
    const requiredConfirmation = 'I confirm deletion of these documents';
    if (!params.confirmation || params.confirmation !== requiredConfirmation) {
      throw {
        type: 'validation',
        details: [{
          field: 'confirmation',
          message: `Confirmation required. Must be "${requiredConfirmation}" to proceed.`
        }]
      };
    }

    // Process each deletion
    const results = await Promise.all(
      params.document_ids.map(async (document_id) => {
        try {
          await this.deleteDocument({ document_id, confirmation: 'I confirm deletion' });
          return {
            success: true,
            document_id
          };
        } catch (error: any) {
          return {
            success: false,
            document_id,
            error: error.message || 'Failed to delete document'
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get recent content from Readwise
   * @param params - The parameters for the request
   * @returns A promise resolving to recent content
   */
  async getRecentContent(params: GetRecentContentParams = {}): Promise<RecentContentResponse> {
    const limit = params.limit || 10;
    const contentType = params.content_type || 'all';

    const results: any[] = [];

    // Fetch books if requested
    if (contentType === 'books' || contentType === 'all') {
      const booksResponse = await this.getBooks({ page_size: limit });
      results.push(...booksResponse.results.map(book => ({
        ...book,
        type: 'book' as const,
        created_at: book.updated || new Date().toISOString()
      })));
    }

    // Fetch highlights if requested
    if (contentType === 'highlights' || contentType === 'all') {
      const highlightsResponse = await this.getHighlights({ page_size: limit });
      results.push(...highlightsResponse.results.map(highlight => ({
        ...highlight,
        type: 'highlight' as const,
        created_at: highlight.created_at
      })));
    }

    // Sort by created_at, newest first
    results.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Limit to requested number
    const limitedResults = results.slice(0, limit);

    return {
      count: limitedResults.length,
      results: limitedResults
    };
  }
}
