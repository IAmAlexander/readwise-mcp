import { SearchHighlightsTool } from '../../src/tools/search-highlights';
import { ReadwiseAPI } from '../../src/api/readwise-api';
import { Logger } from '../../src/utils/logger';
import { SearchResult } from '../../src/types';

// Mock the ReadwiseAPI
jest.mock('../../src/api/readwise-api');

describe('SearchHighlightsTool', () => {
  let tool: SearchHighlightsTool;
  let mockApi: jest.Mocked<ReadwiseAPI>;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    // Create mock API
    mockApi = {
      searchHighlights: jest.fn()
    } as unknown as jest.Mocked<ReadwiseAPI>;
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;
    
    // Create the tool
    tool = new SearchHighlightsTool(mockApi, mockLogger);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it('should have the correct name and description', () => {
    expect(tool.name).toBe('search_highlights');
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
  });
  
  it('should validate parameters correctly', () => {
    // Test valid parameters
    expect(tool.validate({ query: 'test' })).toEqual(expect.objectContaining({ success: true }));
    expect(tool.validate({ query: 'test', limit: 10 })).toEqual(expect.objectContaining({ success: true }));
    
    // Test invalid parameters
    expect(tool.validate({} as any)).toEqual(expect.objectContaining({ success: false }));
    expect(tool.validate({ limit: 10 } as any)).toEqual(expect.objectContaining({ success: false }));
    expect(tool.validate({ query: 'test', limit: 0 })).toEqual(expect.objectContaining({ success: false }));
    expect(tool.validate({ query: 'test', limit: -1 })).toEqual(expect.objectContaining({ success: false }));
  });
  
  it('should execute and return search results', async () => {
    // Set up mock response
    const mockResults: SearchResult[] = [
      {
        highlight: {
          id: '1',
          text: 'This is a test highlight',
          note: 'This is a note',
          location: 42,
          location_type: 'page',
          color: 'yellow',
          book_id: '123',
          book_title: 'Test Book',
          book_author: 'Test Author',
          url: 'https://example.com',
          tags: ['test', 'highlight'],
          created_at: '2023-01-01T12:00:00Z',
          updated_at: '2023-01-01T12:00:00Z',
          highlighted_at: '2023-01-01T12:00:00Z'
        },
        book: {
          id: '123',
          title: 'Test Book',
          author: 'Test Author',
          category: 'book'
        },
        score: 0.95
      },
      {
        highlight: {
          id: '2',
          text: 'Another test highlight',
          note: '',
          location: 84,
          location_type: 'page',
          color: 'blue',
          book_id: '456',
          book_title: 'Another Book',
          book_author: 'Another Author',
          url: 'https://example.com',
          tags: ['test'],
          created_at: '2023-01-02T12:00:00Z',
          updated_at: '2023-01-02T12:00:00Z',
          highlighted_at: '2023-01-02T12:00:00Z'
        },
        book: {
          id: '456',
          title: 'Another Book',
          author: 'Another Author',
          category: 'article'
        },
        score: 0.85
      }
    ];
    
    mockApi.searchHighlights.mockResolvedValue(mockResults);
    
    // Execute the tool
    const result = await tool.execute({ query: 'test' });
    
    // Verify the result
    expect(result).toEqual({ result: mockResults });
    expect(mockApi.searchHighlights).toHaveBeenCalledWith({ query: 'test' });
    expect(mockLogger.debug).toHaveBeenCalled();
  });
  
  it('should handle API errors correctly', async () => {
    // Set up mock error
    const apiError = {
      type: 'api',
      details: {
        status: 401,
        code: 'api_error',
        message: 'Invalid token'
      }
    };
    
    mockApi.searchHighlights.mockRejectedValue(apiError);
    
    // Execute the tool and expect it to reject
    await expect(tool.execute({ query: 'test' })).rejects.toEqual(apiError);
    expect(mockLogger.error).toHaveBeenCalled();
  });
  
  it('should handle unexpected errors correctly', async () => {
    // Spy on the error logger
    mockLogger.error = jest.fn();
    
    // Set up the API mock to throw an unexpected error
    mockApi.searchHighlights.mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    
    // Execute the tool and expect it to not throw but return error in the result
    const result = await tool.execute({ query: 'test' });
    expect(result).toEqual({
      result: [],
      success: false,
      error: 'An unexpected error occurred while searching highlights'
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });
}); 