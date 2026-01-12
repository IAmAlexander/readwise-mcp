import {
  HttpClient,
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
  RecentContentResponse,
  ValidationException
} from '../types/index.js';
import { CONFIRMATIONS } from '../constants.js';

/**
 * API interface for interacting with Readwise
 */
export class ReadwiseAPI {
  /**
   * Create a new ReadwiseAPI
   * @param client - An HTTP client implementing the HttpClient interface
   *                 (either ReadwiseClient for Node.js or FetchClient for Cloudflare Workers)
   */
  constructor(private client: HttpClient) {}
  
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
    const url = `/v2/highlights${queryString ? `?${queryString}` : ''}`;

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
    const url = `/v2/books${queryString ? `?${queryString}` : ''}`;

    return this.client.get<PaginatedResponse<Book>>(url);
  }

  /**
   * Get documents from Readwise Reader (v3 API)
   * @param params - Optional pagination parameters
   * @returns A promise resolving to a paginated response of documents
   */
  async getDocuments(params: { page?: number, page_size?: number, pageCursor?: string } = {}): Promise<PaginatedResponse<Document>> {
    const queryParams = new URLSearchParams();

    // Reader API v3 uses pageCursor for pagination
    if (params.pageCursor) {
      queryParams.append('pageCursor', params.pageCursor);
    }

    // page_size maps to pageSize in v3 API (default is 100)
    if (params.page_size) {
      queryParams.append('pageSize', params.page_size.toString());
    }

    const queryString = queryParams.toString();
    // Use Reader API v3 /list/ endpoint for documents
    const url = `/v3/list/${queryString ? `?${queryString}` : ''}`;

    // Transform v3 response to match our PaginatedResponse format
    const response = await this.client.get<{ results: Document[], nextPageCursor?: string }>(url);
    return {
      count: response.results?.length || 0,
      next: response.nextPageCursor || null,
      previous: null,
      results: response.results || []
    };
  }
  
  /**
   * Search highlights in Readwise
   * Uses the highlights endpoint with search parameter (Readwise doesn't have a dedicated search API)
   * @param params - The search parameters
   * @returns A promise resolving to search results
   */
  async searchHighlights(params: SearchParams): Promise<SearchResult[]> {
    if (!params.query) {
      throw ValidationException.forField('query', 'Search query is required');
    }

    const queryParams = new URLSearchParams();

    // Use the highlights endpoint with search parameter
    queryParams.append('search', params.query);

    if (params.limit) {
      queryParams.append('page_size', params.limit.toString());
    }

    const url = `/v2/highlights?${queryParams.toString()}`;

    // Get highlights and transform to SearchResult format
    const response = await this.client.get<PaginatedResponse<Highlight>>(url);
    return response.results.map(highlight => ({
      highlight,
      book: { id: highlight.book_id, title: highlight.book_title || '', category: '' } as Book,
      score: 1
    }));
  }

  /**
   * Get all tags from Readwise Reader (v3 API)
   * @returns A promise resolving to a list of all tags
   */
  async getTags(): Promise<TagResponse> {
    // Use Reader API v3 for tags
    const response = await this.client.get<{ results: Array<{ name: string, id: string }> }>('/v3/tags/');
    return {
      count: response.results?.length || 0,
      tags: response.results?.map(t => t.name) || []
    };
  }

  /**
   * Get tags for a specific document
   * Note: Reader API doesn't have a dedicated endpoint for document tags.
   * We fetch the document and extract its tags.
   * @param documentId - The ID of the document
   * @returns A promise resolving to the document's tags
   */
  async getDocumentTags(documentId: string): Promise<DocumentTagsResponse> {
    // Fetch the document to get its tags
    const response = await this.client.get<{ results: Document[] }>(`/v3/list/?id=${documentId}`);
    const doc = response.results?.[0];
    return {
      document_id: documentId,
      tags: (doc as any)?.tags?.map((t: any) => typeof t === 'string' ? t : t.name) || []
    };
  }

  /**
   * Update tags for a specific document using Reader API v3
   * @param documentId - The ID of the document
   * @param tags - The new tags to set
   * @returns A promise resolving to the updated document tags
   */
  async updateDocumentTags(documentId: string, tags: string[]): Promise<DocumentTagsResponse> {
    // Use v3 update endpoint to set tags
    await this.client.patch(`/v3/update/${documentId}/`, { tags });
    return {
      document_id: documentId,
      tags
    };
  }

  /**
   * Add a tag to a document
   * Note: Implemented by fetching current tags and updating with the new tag added
   * @param documentId - The ID of the document
   * @param tag - The tag to add
   * @returns A promise resolving to the updated document tags
   */
  async addTagToDocument(documentId: string, tag: string): Promise<DocumentTagsResponse> {
    const currentTags = await this.getDocumentTags(documentId);
    const newTags = [...new Set([...currentTags.tags, tag])];
    return this.updateDocumentTags(documentId, newTags);
  }

  /**
   * Remove a tag from a document
   * Note: Implemented by fetching current tags and updating without the removed tag
   * @param documentId - The ID of the document
   * @param tag - The tag to remove
   * @returns A promise resolving to the updated document tags
   */
  async removeTagFromDocument(documentId: string, tag: string): Promise<DocumentTagsResponse> {
    const currentTags = await this.getDocumentTags(documentId);
    const newTags = currentTags.tags.filter(t => t !== tag);
    return this.updateDocumentTags(documentId, newTags);
  }

  /**
   * Add tags to multiple documents
   * Note: Implemented by updating each document individually (no bulk API available)
   * @param params - The bulk tag operation parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkTagDocuments(params: BulkTagRequest): Promise<BulkTagResponse> {
    const errors: Array<{ document_id: string; error: string }> = [];
    let updatedCount = 0;

    for (const docId of params.document_ids) {
      try {
        if (params.replace_existing) {
          await this.updateDocumentTags(docId, params.tags);
        } else {
          const currentTags = await this.getDocumentTags(docId);
          const newTags = [...new Set([...currentTags.tags, ...params.tags])];
          await this.updateDocumentTags(docId, newTags);
        }
        updatedCount++;
      } catch (error) {
        errors.push({
          document_id: docId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: errors.length === 0,
      updated_documents: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get reading progress for a document
   * Uses Reader v3 API to fetch document with reading_progress field
   * @param params - The parameters for the request
   * @returns A promise resolving to the reading progress
   */
  async getReadingProgress(params: GetReadingProgressParams): Promise<ReadingProgress> {
    // Fetch document from Reader API - it includes reading_progress
    const response = await this.client.get<{ results: any[] }>(`/v3/list/?id=${params.document_id}`);
    const doc = response.results?.[0];

    if (!doc) {
      throw new Error(`Document not found: ${params.document_id}`);
    }

    // Reader API includes reading_progress as a percentage (0-100)
    const progress = doc.reading_progress || 0;
    const status = progress === 0 ? 'not_started' : progress >= 100 ? 'completed' : 'in_progress';

    return {
      document_id: params.document_id,
      title: doc.title || '',
      status,
      percentage: Math.round(progress * 100) / 100,
      current_page: undefined,
      total_pages: undefined,
      last_read_at: doc.last_moved_at || doc.updated_at
    };
  }

  /**
   * Update reading progress for a document
   * Note: Reader API doesn't support directly updating reading progress via API.
   * This is a read-only field that syncs from the Reader app.
   * @param params - The parameters for the request
   * @returns A promise resolving to the current reading progress (cannot be updated via API)
   */
  async updateReadingProgress(params: UpdateReadingProgressParams): Promise<ReadingProgress> {
    // Reader API doesn't support updating reading progress directly
    // Just return current progress with a note
    const current = await this.getReadingProgress({ document_id: params.document_id });
    console.warn('Note: Reading progress cannot be updated via API. It syncs from the Reader app.');
    return current;
  }

  /**
   * Get reading list with progress information
   * Uses Reader v3 API /list/ endpoint with location filter
   * @param params - The parameters for the request
   * @returns A promise resolving to a paginated response of documents with reading progress
   */
  async getReadingList(params: GetReadingListParams = {}): Promise<ReadingListResponse> {
    const queryParams = new URLSearchParams();

    // Map status to Reader API location parameter
    // Reader locations: new, later, shortlist, archive, feed
    if (params.status === 'in_progress') {
      queryParams.append('location', 'shortlist');
    } else if (params.status === 'completed') {
      queryParams.append('location', 'archive');
    }
    // Note: 'not_started' maps to 'new' or 'later' but we'll fetch all and filter

    if (params.category) {
      queryParams.append('category', params.category);
    }

    if (params.page_size) {
      queryParams.append('pageSize', params.page_size.toString());
    }

    const queryString = queryParams.toString();
    const url = `/v3/list/${queryString ? `?${queryString}` : ''}`;

    const response = await this.client.get<{ results: any[], nextPageCursor?: string }>(url);

    // Transform response to match ReadingListResponse format
    const results = (response.results || []).map((doc: any) => {
      const progress = doc.reading_progress || 0;
      const status = progress === 0 ? 'not_started' : progress >= 100 ? 'completed' : 'in_progress';
      return {
        ...doc,
        reading_progress: {
          document_id: doc.id,
          title: doc.title,
          status,
          percentage: Math.round(progress * 100) / 100
        }
      };
    });

    return {
      count: results.length,
      next: response.nextPageCursor,
      previous: undefined,
      results
    };
  }

  /**
   * Create a new highlight using Readwise v2 API
   * @param params - The parameters for creating the highlight
   * @returns A promise resolving to the created highlight
   */
  async createHighlight(params: CreateHighlightParams): Promise<Highlight> {
    // Readwise v2 API expects highlights in a specific format
    const payload = {
      highlights: [{
        text: params.text,
        source_type: 'readwise-mcp',
        book_id: params.book_id,
        note: params.note,
        location: params.location,
        location_type: params.location_type,
        color: params.color
      }]
    };
    const response = await this.client.post<any>('/v2/highlights/', payload);
    // Return the first created highlight
    const createdHighlight = response.modified_highlights?.[0] || response;
    return createdHighlight as Highlight;
  }

  /**
   * Update an existing highlight using Readwise v2 API
   * Note: Readwise v2 API doesn't have a direct update endpoint.
   * Updates are done by re-posting with highlight_url if set.
   * @param params - The parameters for updating the highlight
   * @returns A promise resolving to the updated highlight
   */
  async updateHighlight(params: UpdateHighlightParams): Promise<Highlight> {
    // Readwise v2 doesn't have PATCH/PUT for highlights
    // We need to use the POST endpoint with the same highlight_url to update
    const payload = {
      highlights: [{
        highlight_url: `readwise://highlight/${params.highlight_id}`,
        text: params.text,
        note: params.note,
        location: params.location,
        location_type: params.location_type,
        color: params.color
      }]
    };
    const response = await this.client.post<any>('/v2/highlights/', payload);
    return (response.modified_highlights?.[0] || response) as Highlight;
  }

  /**
   * Delete a highlight
   * Note: Readwise v2 API doesn't support deleting highlights via API.
   * This operation is not available.
   * @param params - The parameters for deleting the highlight
   * @returns A promise that rejects with an error
   */
  async deleteHighlight(params: DeleteHighlightParams): Promise<{ success: boolean }> {
    // Readwise API doesn't support deleting highlights
    throw new Error('Deleting highlights is not supported by the Readwise API. Please delete highlights through the Readwise app or website.');
  }

  /**
   * Create a note for a highlight
   * Note: Readwise doesn't have a separate notes API.
   * Notes are updated by re-posting the highlight with the note field.
   * @param params - The parameters for creating the note
   * @returns A promise resolving to the updated highlight
   */
  async createNote(params: CreateNoteParams): Promise<Highlight> {
    return this.updateHighlight({
      highlight_id: params.highlight_id,
      note: params.note
    });
  }

  /**
   * Update a note for a highlight
   * Note: Same as createNote - uses the highlight update mechanism
   * @param params - The parameters for updating the note
   * @returns A promise resolving to the updated highlight
   */
  async updateNote(params: UpdateNoteParams): Promise<Highlight> {
    return this.updateHighlight({
      highlight_id: params.highlight_id,
      note: params.note
    });
  }

  /**
   * Delete a note from a highlight
   * Note: Sets the note to empty string via highlight update
   * @param params - The parameters for deleting the note
   * @returns A promise resolving to the updated highlight
   */
  async deleteNote(params: DeleteNoteParams): Promise<Highlight> {
    return this.updateHighlight({
      highlight_id: params.highlight_id,
      note: ''
    });
  }

  /**
   * Advanced search for highlights with multiple filters
   * Note: Readwise doesn't have a dedicated advanced search API.
   * This uses the highlights endpoint with available filters and client-side filtering.
   * @param params - The advanced search parameters
   * @returns A promise resolving to the search results
   */
  async advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResult> {
    const queryParams = new URLSearchParams();

    // Use search parameter for text query
    if (params.query) {
      queryParams.append('search', params.query);
    }

    // Filter by book_id if specified (only first one supported by API)
    if (params.book_ids?.length) {
      queryParams.append('book_id', params.book_ids[0]);
    }

    // Pagination
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }

    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }

    const url = `/v2/highlights?${queryParams.toString()}`;
    const response = await this.client.get<PaginatedResponse<Highlight>>(url);

    // Client-side filtering for features not supported by API
    let highlights = response.results;

    // Filter by date range if specified
    if (params.date_range?.start || params.date_range?.end) {
      highlights = highlights.filter(h => {
        const date = new Date(h.highlighted_at || h.created_at || '');
        if (params.date_range?.start && date < new Date(params.date_range.start)) return false;
        if (params.date_range?.end && date > new Date(params.date_range.end)) return false;
        return true;
      });
    }

    // Filter by has_note
    if (params.has_note !== undefined) {
      highlights = highlights.filter(h => params.has_note ? !!h.note : !h.note);
    }

    // Build basic facets from results
    const bookCounts: Record<string, { title: string; count: number }> = {};
    highlights.forEach(h => {
      const bookKey = h.book_id?.toString() || 'unknown';
      if (!bookCounts[bookKey]) {
        bookCounts[bookKey] = { title: h.book_title || '', count: 0 };
      }
      bookCounts[bookKey].count++;
    });

    const facets = {
      categories: [] as Array<{ category: string; count: number }>,
      tags: [] as Array<{ tag: string; count: number }>,
      books: Object.entries(bookCounts).map(([book_id, data]) => ({
        book_id,
        title: data.title,
        count: data.count
      }))
    };

    return {
      highlights: {
        count: highlights.length,
        next: response.next,
        previous: response.previous,
        results: highlights
      },
      facets
    };
  }

  /**
   * Search highlights by tags
   * Note: Readwise API doesn't support tag filtering directly.
   * Returns all highlights (consider filtering client-side).
   * @param params - The tag search parameters
   * @returns A promise resolving to a paginated response of highlights
   */
  async searchByTags(params: SearchByTagParams): Promise<PaginatedResponse<Highlight>> {
    // Readwise v2 API doesn't support tag filtering on highlights
    // We fetch highlights and note that tags are on books, not highlights
    const queryParams = new URLSearchParams();

    if (params.page) {
      queryParams.append('page', params.page.toString());
    }

    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }

    const url = `/v2/highlights?${queryParams.toString()}`;
    return this.client.get<PaginatedResponse<Highlight>>(url);
  }

  /**
   * Search highlights by date range
   * Uses the highlights endpoint with client-side date filtering
   * @param params - The date search parameters
   * @returns A promise resolving to a paginated response of highlights
   */
  async searchByDate(params: SearchByDateParams): Promise<PaginatedResponse<Highlight>> {
    const queryParams = new URLSearchParams();

    // Readwise v2 supports highlighted_at__gt and highlighted_at__lt for date filtering
    if (params.start_date) {
      queryParams.append('highlighted_at__gt', params.start_date);
    }
    if (params.end_date) {
      queryParams.append('highlighted_at__lt', params.end_date);
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }

    return this.client.get<PaginatedResponse<Highlight>>(`/v2/highlights?${queryParams}`);
  }

  // Video-related methods
  // Note: Videos in Readwise Reader are just documents with category='video'
  // There's no separate video API - we use the /v3/list/ endpoint with filters

  async getVideos(params?: GetVideosParams): Promise<VideoResponse> {
    const queryParams = new URLSearchParams();

    // Filter by video category
    queryParams.append('category', 'video');

    if (params?.limit) {
      queryParams.append('pageSize', params.limit.toString());
    }

    if (params?.pageCursor) {
      queryParams.append('pageCursor', params.pageCursor);
    }

    const response = await this.client.get<{ results: any[], nextPageCursor?: string }>(`/v3/list/?${queryParams}`);

    return {
      count: response.results?.length || 0,
      results: response.results || [],
      nextPageCursor: response.nextPageCursor
    };
  }

  async getVideo(document_id: string): Promise<VideoDetailsResponse> {
    // Fetch the document by ID
    const response = await this.client.get<{ results: any[] }>(`/v3/list/?id=${document_id}`);
    const doc = response.results?.[0];

    if (!doc) {
      throw new Error(`Video document not found: ${document_id}`);
    }

    return {
      id: doc.id,
      title: doc.title || '',
      url: doc.source_url || doc.url || '',
      author: doc.author || '',
      tags: (doc.tags || []).map((t: any) => typeof t === 'string' ? t : t.name),
      platform: doc.source || 'unknown',
      duration: undefined, // Reader doesn't store video duration
      thumbnail_url: doc.image_url,
      description: doc.summary,
      transcript: [] // Transcript not available via API
    };
  }

  async createVideoHighlight(params: CreateVideoHighlightParams): Promise<VideoHighlight> {
    // Video highlights are regular highlights - use the v2 highlights API
    const payload = {
      highlights: [{
        text: params.text,
        note: params.note,
        source_type: 'readwise-mcp',
        location: params.timestamp, // Use timestamp as location
        location_type: 'time_offset'
      }]
    };
    const response = await this.client.post<any>('/v2/highlights/', payload);
    const highlight = response.modified_highlights?.[0] || response;
    const now = new Date().toISOString();

    return {
      id: highlight.id?.toString() || '',
      text: params.text,
      timestamp: params.timestamp,
      note: params.note,
      created_at: highlight.created_at || now,
      updated_at: highlight.updated_at || now
    };
  }

  async getVideoHighlights(document_id: string): Promise<VideoHighlightsResponse> {
    // Get highlights for this document using v2 API
    const response = await this.client.get<PaginatedResponse<Highlight>>(`/v2/highlights?book_id=${document_id}`);

    return {
      count: response.results.length,
      results: response.results.map(h => ({
        id: h.id?.toString() || '',
        text: h.text,
        timestamp: String(h.location || '0'),
        note: h.note,
        created_at: h.created_at || '',
        updated_at: h.updated_at || h.created_at || ''
      }))
    };
  }

  async updateVideoPosition(params: UpdateVideoPositionParams): Promise<VideoPlaybackPosition> {
    // Reader API doesn't support playback position tracking via API
    // This is a read-only feature that syncs from the Reader app
    console.warn('Note: Video playback position cannot be updated via API.');
    return {
      document_id: params.document_id,
      position: params.position,
      percentage: params.duration > 0 ? (params.position / params.duration) * 100 : 0,
      last_updated: new Date().toISOString()
    };
  }

  async getVideoPosition(document_id: string): Promise<VideoPlaybackPosition> {
    // Fetch document to get reading_progress which represents playback position
    const response = await this.client.get<{ results: any[] }>(`/v3/list/?id=${document_id}`);
    const doc = response.results?.[0];

    if (!doc) {
      throw new Error(`Video document not found: ${document_id}`);
    }

    const progress = doc.reading_progress || 0;
    return {
      document_id,
      position: 0, // Actual position not available via API
      percentage: progress,
      last_updated: doc.last_moved_at || doc.updated_at || new Date().toISOString()
    };
  }

  /**
   * Save a new document to Readwise
   * @param params - The parameters for saving the document
   * @returns A promise resolving to the saved document
   */
  async saveDocument(params: SaveDocumentParams): Promise<SaveDocumentResponse> {
    if (!params.url) {
      throw ValidationException.forField('url', 'URL is required');
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
    return this.client.post<SaveDocumentResponse>('/v3/save/', payload);
  }

  /**
   * Update an existing document's metadata
   * @param params - The parameters for updating the document
   * @returns A promise resolving to the updated document
   */
  async updateDocument(params: UpdateDocumentParams): Promise<Document> {
    if (!params.document_id) {
      throw ValidationException.forField('document_id', 'Document ID is required');
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
      throw ValidationException.forField('payload', 'No update fields provided');
    }

    // Note: Using v3 API endpoint for updating documents
    return this.client.patch<Document>(`/v3/update/${params.document_id}/`, payload);
  }

  /**
   * Delete a document from Readwise
   * @param params - The parameters for deleting the document
   * @returns A promise resolving to the deletion result
   */
  async deleteDocument(params: DeleteDocumentParams): Promise<DeleteDocumentResponse> {
    if (!params.document_id) {
      throw ValidationException.forField('document_id', 'Document ID is required');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.DELETE_DOCUMENT) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.DELETE_DOCUMENT}" to confirm deletion.`);
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
      throw ValidationException.forField('items', 'Items array is required and must not be empty');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.BULK_SAVE_DOCUMENTS) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.BULK_SAVE_DOCUMENTS}" to proceed.`);
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
      throw ValidationException.forField('updates', 'Updates array is required and must not be empty');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.BULK_UPDATE_DOCUMENTS) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.BULK_UPDATE_DOCUMENTS}" to proceed.`);
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
      throw ValidationException.forField('document_ids', 'Document IDs array is required and must not be empty');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.BULK_DELETE_DOCUMENTS) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.BULK_DELETE_DOCUMENTS}" to proceed.`);
    }

    // Process each deletion
    const results = await Promise.all(
      params.document_ids.map(async (document_id) => {
        try {
          await this.deleteDocument({ document_id, confirmation: CONFIRMATIONS.DELETE_DOCUMENT });
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
