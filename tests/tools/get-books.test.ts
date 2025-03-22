import { GetBooksTool } from '../../src/tools/get-books.js';
import { ReadwiseAPI } from '../../src/api/readwise-api.js';
import { Logger } from '../../src/utils/logger.js';
import { Book, PaginatedResponse } from '../../src/types/index.js';
import { validateNumberRange } from '../../src/types/validation.js';

// Get mocked instances of validateNumberRange
// This will make our tests match what the implementation actually does
jest.mock('../../src/types/validation', () => {
  return {
    validateNumberRange: jest.fn(),
    validationSuccess: jest.fn().mockReturnValue({ success: true }),
    validationError: jest.fn().mockImplementation((field, message) => {
      return {
        success: false,
        errors: [{ field, message }]
      };
    })
  };
});

// Mocking ReadwiseAPI and Logger
jest.mock('../../src/api/readwise-api');
jest.mock('../../src/utils/logger');

describe('GetBooksTool', () => {
  let tool: GetBooksTool;
  let mockApi: jest.Mocked<ReadwiseAPI>;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock API
    mockApi = {
      getBooks: jest.fn()
    } as unknown as jest.Mocked<ReadwiseAPI>;
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;
    
    // Create the tool
    tool = new GetBooksTool(mockApi, mockLogger);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it('should have the correct name and description', () => {
    expect(tool.name).toBe('get_books');
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
  });
  
  it('should validate parameters correctly', () => {
    const tool = new GetBooksTool(mockApi, mockLogger);
    
    // No mocked validateNumberRange calls should have happened yet
    expect(validateNumberRange).not.toHaveBeenCalled();
    
    // Test valid parameters - these should pass
    expect(tool.validate({})).toEqual(expect.objectContaining({ success: true }));
    
    // These should call validateNumberRange but still pass
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ success: true });
    expect(tool.validate({ page: 1 })).toEqual(expect.objectContaining({ success: true }));
    
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ success: true });
    expect(tool.validate({ page_size: 10 })).toEqual(expect.objectContaining({ success: true }));
    
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ success: true });
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ success: true });
    expect(tool.validate({ page: 1, page_size: 10 })).toEqual(expect.objectContaining({ success: true }));
    
    // Test invalid parameters - these should fail
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ 
      success: false, 
      errors: [{ field: 'page', message: 'Page must be a positive number' }] 
    });
    expect(tool.validate({ page: 0 })).toEqual(expect.objectContaining({ success: false }));
    
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ 
      success: false, 
      errors: [{ field: 'page', message: 'Page must be a positive number' }] 
    });
    expect(tool.validate({ page: -1 })).toEqual(expect.objectContaining({ success: false }));
    
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ 
      success: false, 
      errors: [{ field: 'page_size', message: 'Page size must be a number between 1 and 100' }] 
    });
    expect(tool.validate({ page_size: 0 })).toEqual(expect.objectContaining({ success: false }));
    
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ 
      success: false, 
      errors: [{ field: 'page_size', message: 'Page size must be a number between 1 and 100' }] 
    });
    expect(tool.validate({ page_size: -10 })).toEqual(expect.objectContaining({ success: false }));
    
    (validateNumberRange as jest.Mock).mockReturnValueOnce({ 
      success: false, 
      errors: [{ field: 'page_size', message: 'Page size must be a number between 1 and 100' }] 
    });
    expect(tool.validate({ page_size: 101 })).toEqual(expect.objectContaining({ success: false }));
  });
  
  it('should execute and return books', async () => {
    // Set up mock response
    const mockResponse: PaginatedResponse<Book> = {
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: '1',
          title: 'Test Book 1',
          category: 'book'
        },
        {
          id: '2',
          title: 'Test Book 2',
          category: 'article'
        }
      ]
    };
    
    mockApi.getBooks.mockResolvedValue(mockResponse);
    
    // Execute the tool
    const result = await tool.execute({});
    
    // Verify the result
    expect(result).toEqual({ result: mockResponse });
    expect(mockApi.getBooks).toHaveBeenCalledWith({});
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
    
    mockApi.getBooks.mockRejectedValue(apiError);
    
    // Execute the tool and expect it to reject
    await expect(tool.execute({})).rejects.toEqual(apiError);
    expect(mockLogger.error).toHaveBeenCalled();
  });
  
  it('should handle unexpected errors correctly', async () => {
    // Spy on the error logger
    mockLogger.error = jest.fn();
    
    // Set up the API mock to throw an unexpected error
    mockApi.getBooks.mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    
    // Execute the tool and expect it to not throw but return error in the result
    const result = await tool.execute({});
    expect(result).toEqual({
      result: { count: 0, next: null, previous: null, results: [] },
      success: false,
      error: 'An unexpected error occurred while fetching books'
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });
}); 