/**
 * API interface for interacting with Readwise
 */
export class ReadwiseAPI {
    /**
     * Create a new ReadwiseAPI
     * @param client - The ReadwiseClient instance to use
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * Get highlights from Readwise
     * @param params - The parameters for the request
     * @returns A promise resolving to a paginated response of highlights
     */
    async getHighlights(params = {}) {
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
        return this.client.get(url);
    }
    /**
     * Get books from Readwise
     * @param params - The parameters for the request
     * @returns A promise resolving to a paginated response of books
     */
    async getBooks(params = {}) {
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
        return this.client.get(url);
    }
    /**
     * Get documents from Readwise
     * @param params - Optional pagination parameters
     * @returns A promise resolving to a paginated response of documents
     */
    async getDocuments(params = {}) {
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
        return this.client.get(url);
    }
    /**
     * Search highlights in Readwise
     * @param params - The search parameters
     * @returns A promise resolving to search results
     */
    async searchHighlights(params) {
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
        return this.client.get(url);
    }
    /**
     * Get all tags from Readwise
     * @returns A promise resolving to a list of all tags
     */
    async getTags() {
        return this.client.get('/tags');
    }
    /**
     * Get tags for a specific document
     * @param documentId - The ID of the document
     * @returns A promise resolving to the document's tags
     */
    async getDocumentTags(documentId) {
        return this.client.get(`/document/${documentId}/tags`);
    }
    /**
     * Update tags for a specific document
     * @param documentId - The ID of the document
     * @param tags - The new tags to set
     * @returns A promise resolving to the updated document tags
     */
    async updateDocumentTags(documentId, tags) {
        return this.client.put(`/document/${documentId}/tags`, { tags });
    }
    /**
     * Add a tag to a document
     * @param documentId - The ID of the document
     * @param tag - The tag to add
     * @returns A promise resolving to the updated document tags
     */
    async addTagToDocument(documentId, tag) {
        return this.client.post(`/document/${documentId}/tags/${encodeURIComponent(tag)}`);
    }
    /**
     * Remove a tag from a document
     * @param documentId - The ID of the document
     * @param tag - The tag to remove
     * @returns A promise resolving to the updated document tags
     */
    async removeTagFromDocument(documentId, tag) {
        return this.client.delete(`/document/${documentId}/tags/${encodeURIComponent(tag)}`);
    }
    /**
     * Add tags to multiple documents
     * @param params - The bulk tag operation parameters
     * @returns A promise resolving to the bulk operation results
     */
    async bulkTagDocuments(params) {
        return this.client.post('/bulk/tag', params);
    }
    /**
     * Get reading progress for a document
     * @param params - The parameters for the request
     * @returns A promise resolving to the reading progress
     */
    async getReadingProgress(params) {
        const document = await this.client.get(`/document/${params.document_id}/progress`);
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
    async updateReadingProgress(params) {
        const response = await this.client.put(`/document/${params.document_id}/progress`, params);
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
    async getReadingList(params = {}) {
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
        return this.client.get(url);
    }
    /**
     * Create a new highlight
     * @param params - The parameters for creating the highlight
     * @returns A promise resolving to the created highlight
     */
    async createHighlight(params) {
        return this.client.post('/highlights', params);
    }
    /**
     * Update an existing highlight
     * @param params - The parameters for updating the highlight
     * @returns A promise resolving to the updated highlight
     */
    async updateHighlight(params) {
        return this.client.put(`/highlights/${params.highlight_id}`, params);
    }
    /**
     * Delete a highlight
     * @param params - The parameters for deleting the highlight
     * @returns A promise resolving to the deletion result
     */
    async deleteHighlight(params) {
        return this.client.delete(`/highlights/${params.highlight_id}`);
    }
    /**
     * Create a note for a highlight
     * @param params - The parameters for creating the note
     * @returns A promise resolving to the updated highlight
     */
    async createNote(params) {
        return this.client.post(`/highlights/${params.highlight_id}/notes`, { note: params.note });
    }
    /**
     * Update a note for a highlight
     * @param params - The parameters for updating the note
     * @returns A promise resolving to the updated highlight
     */
    async updateNote(params) {
        return this.client.put(`/highlights/${params.highlight_id}/notes`, { note: params.note });
    }
    /**
     * Delete a note from a highlight
     * @param params - The parameters for deleting the note
     * @returns A promise resolving to the updated highlight
     */
    async deleteNote(params) {
        return this.client.delete(`/highlights/${params.highlight_id}/notes`);
    }
    /**
     * Advanced search for highlights with multiple filters and facets
     * @param params - The advanced search parameters
     * @returns A promise resolving to the search results with facets
     */
    async advancedSearch(params) {
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
        return this.client.get(url);
    }
    /**
     * Search highlights by tags
     * @param params - The tag search parameters
     * @returns A promise resolving to a paginated response of highlights
     */
    async searchByTags(params) {
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
        return this.client.get(url);
    }
    /**
     * Search highlights by date range
     * @param params - The date search parameters
     * @returns A promise resolving to a paginated response of highlights
     */
    async searchByDate(params) {
        const queryParams = new URLSearchParams();
        if (params.start_date)
            queryParams.append('start_date', params.start_date);
        if (params.end_date)
            queryParams.append('end_date', params.end_date);
        if (params.date_field)
            queryParams.append('date_field', params.date_field);
        if (params.page)
            queryParams.append('page', params.page.toString());
        if (params.page_size)
            queryParams.append('page_size', params.page_size.toString());
        return this.client.get(`/highlights/search/date?${queryParams}`);
    }
    // Video-related methods
    async getVideos(params) {
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
        const response = await this.client.get(`/videos?${queryParams}`);
        return response;
    }
    async getVideo(document_id) {
        const response = await this.client.get(`/video/${document_id}`);
        return response;
    }
    async createVideoHighlight(params) {
        const response = await this.client.post(`/video/${params.document_id}/highlight`, {
            text: params.text,
            timestamp: params.timestamp,
            note: params.note
        });
        return response;
    }
    async getVideoHighlights(document_id) {
        const response = await this.client.get(`/video/${document_id}/highlights`);
        return response;
    }
    async updateVideoPosition(params) {
        const response = await this.client.post(`/video/${params.document_id}/position`, {
            position: params.position,
            duration: params.duration
        });
        return response;
    }
    async getVideoPosition(document_id) {
        const response = await this.client.get(`/video/${document_id}/position`);
        return response;
    }
}
