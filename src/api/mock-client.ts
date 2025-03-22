import { Book, Document, Highlight, PaginatedResponse, SearchParams, SearchResult } from '../types/index.js';

/**
 * Mock data for testing
 */
const MOCK_BOOKS: Book[] = [
  {
    id: 'book-1',
    title: 'The Art of Computer Programming',
    author: 'Donald Knuth',
    category: 'books',
    source: 'kindle',
    cover_image_url: 'https://example.com/book1.jpg',
    updated: '2023-05-15T10:00:00Z'
  },
  {
    id: 'book-2',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'books',
    source: 'kindle',
    cover_image_url: 'https://example.com/book2.jpg',
    updated: '2023-06-20T14:30:00Z'
  },
  {
    id: 'book-3',
    title: 'Artificial Intelligence: A Modern Approach',
    author: 'Stuart Russell, Peter Norvig',
    category: 'books',
    source: 'kindle',
    cover_image_url: 'https://example.com/book3.jpg',
    updated: '2023-07-10T09:15:00Z'
  }
];

const MOCK_HIGHLIGHTS: Highlight[] = [
  {
    id: 'highlight-1',
    text: 'Programs should be written for people to read, and only incidentally for machines to execute.',
    note: 'Important principle of code readability',
    location: 42,
    color: 'yellow',
    book_id: 'book-1',
    updated: '2023-05-20T11:30:00Z',
    created_at: '2023-05-15T11:30:00Z',
    updated_at: '2023-05-20T11:30:00Z'
  },
  {
    id: 'highlight-2',
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    note: '',
    location: 105,
    color: 'blue',
    book_id: 'book-2',
    updated: '2023-06-25T16:45:00Z',
    created_at: '2023-06-20T16:45:00Z',
    updated_at: '2023-06-25T16:45:00Z'
  },
  {
    id: 'highlight-3',
    text: 'Machine learning is the science of getting computers to act without being explicitly programmed.',
    note: 'Definition of ML',
    location: 231,
    color: 'green',
    book_id: 'book-3',
    updated: '2023-07-12T10:20:00Z',
    created_at: '2023-07-10T10:20:00Z',
    updated_at: '2023-07-12T10:20:00Z'
  }
];

const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    title: 'An Introduction to Neural Networks',
    author: 'John Smith',
    source: 'web',
    url: 'https://example.com/neural-networks',
    created_at: '2023-08-01T13:10:00Z',
    updated_at: '2023-08-05T13:10:00Z'
  },
  {
    id: 'doc-2',
    title: 'The Future of AI',
    author: 'Jane Doe',
    source: 'web',
    url: 'https://example.com/future-ai',
    created_at: '2023-08-05T15:25:00Z',
    updated_at: '2023-08-10T15:25:00Z'
  }
];

/**
 * Mock implementation of the Readwise API for testing
 * This implements the same methods as ReadwiseAPI without formally implementing the interface
 */
export class MockReadwiseAPI {
  /**
   * Simulate network delay for realistic testing
   */
  private async delay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get a list of books from the mock database
   */
  async getBooks(params: any = {}): Promise<PaginatedResponse<Book>> {
    await this.delay();
    
    const page = params.page || 1;
    const pageSize = params.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      count: MOCK_BOOKS.length,
      next: endIndex < MOCK_BOOKS.length ? `/api/books?page=${page + 1}` : null,
      previous: page > 1 ? `/api/books?page=${page - 1}` : null,
      results: MOCK_BOOKS.slice(startIndex, endIndex)
    };
  }

  /**
   * Get a list of highlights from the mock database
   */
  async getHighlights(params: any = {}): Promise<PaginatedResponse<Highlight>> {
    await this.delay();
    
    let highlights = [...MOCK_HIGHLIGHTS];
    
    // Filter by book_id if provided
    if (params.book_id) {
      highlights = highlights.filter(h => h.book_id === params.book_id);
    }
    
    const page = params.page || 1;
    const pageSize = params.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      count: highlights.length,
      next: endIndex < highlights.length ? `/api/highlights?page=${page + 1}` : null,
      previous: page > 1 ? `/api/highlights?page=${page - 1}` : null,
      results: highlights.slice(startIndex, endIndex)
    };
  }

  /**
   * Get a list of documents from the mock database
   */
  async getDocuments(params: any = {}): Promise<PaginatedResponse<Document>> {
    await this.delay();
    
    const page = params.page || 1;
    const pageSize = params.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      count: MOCK_DOCUMENTS.length,
      next: endIndex < MOCK_DOCUMENTS.length ? `/api/documents?page=${page + 1}` : null,
      previous: page > 1 ? `/api/documents?page=${page - 1}` : null,
      results: MOCK_DOCUMENTS.slice(startIndex, endIndex)
    };
  }

  /**
   * Search highlights from the mock database
   */
  async searchHighlights(params: SearchParams): Promise<SearchResult[]> {
    await this.delay();
    
    // Simple case-insensitive search implementation
    const query = params.query.toLowerCase();
    const results = MOCK_HIGHLIGHTS.filter(h => 
      h.text.toLowerCase().includes(query) || 
      (h.note && h.note.toLowerCase().includes(query))
    ).map(highlight => {
      const book = MOCK_BOOKS.find(b => b.id === highlight.book_id)!;
      return {
        highlight,
        book,
        score: 0.9 // High relevance score for all results in mock data
      };
    });
    
    // Apply limit if specified
    const limit = params.limit || 10;
    return results.slice(0, limit);
  }
  
  /**
   * Get a book by ID
   */
  async getBook(bookId: string): Promise<Book | null> {
    await this.delay();
    return MOCK_BOOKS.find(book => book.id === bookId) || null;
  }
  
  /**
   * Get a highlight by ID
   */
  async getHighlight(highlightId: string): Promise<Highlight | null> {
    await this.delay();
    return MOCK_HIGHLIGHTS.find(highlight => highlight.id === highlightId) || null;
  }
  
  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    await this.delay();
    return MOCK_DOCUMENTS.find(document => document.id === documentId) || null;
  }
} 