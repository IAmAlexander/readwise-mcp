import { ReadwiseHighlightPrompt, ReadwiseHighlightPromptParams } from '../../src/prompts/highlight-prompt.js';
import { Logger } from '../../src/utils/logger.js';
import { ReadwiseAPI } from '../../src/api/readwise-api.js';

// Mock the required dependencies
jest.mock('../../src/api/readwise-api');
jest.mock('../../src/utils/logger');

describe('ReadwiseHighlightPrompt', () => {
  let prompt: ReadwiseHighlightPrompt;
  let mockLogger: jest.Mocked<Logger>;
  let mockReadwiseAPI: jest.Mocked<ReadwiseAPI>;
  
  const mockHighlights = [
    {
      id: 1,
      text: 'This is a test highlight',
      note: 'This is a note',
      location: 42,
      location_type: 'page',
      highlighted_at: new Date().toISOString(),
      url: 'https://example.com',
      color: 'yellow',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      book_id: 123,
      tags: ['test', 'highlight']
    },
    {
      id: 2,
      text: 'This is another test highlight',
      note: '',
      location: 84,
      location_type: 'page',
      highlighted_at: new Date().toISOString(),
      url: 'https://example.com',
      color: 'blue',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      book_id: 123,
      tags: ['test']
    }
  ];

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Mock ReadwiseAPI
    mockReadwiseAPI = {
      getHighlights: jest.fn().mockResolvedValue({ results: mockHighlights }),
    } as unknown as jest.Mocked<ReadwiseAPI>;

    // Reset all mocks
    jest.clearAllMocks();
    
    // Create the prompt
    prompt = new ReadwiseHighlightPrompt(mockReadwiseAPI, mockLogger);
  });

  it('should have the correct name and description', () => {
    expect(prompt.name).toBe('readwise_highlight');
    expect(prompt.description).toBeDefined();
    expect(prompt.description.length).toBeGreaterThan(0);
  });

  it('should have the correct parameters definition', () => {
    expect(prompt.parameters).toBeDefined();
    expect(prompt.parameters.properties).toBeDefined();
    expect(prompt.parameters.properties.book_id).toBeDefined();
    expect(prompt.parameters.properties.page).toBeDefined();
    expect(prompt.parameters.properties.page_size).toBeDefined();
    expect(prompt.parameters.properties.search).toBeDefined();
    expect(prompt.parameters.properties.context).toBeDefined();
    expect(prompt.parameters.properties.task).toBeDefined();
  });

  it('should validate parameters correctly - valid parameters', () => {
    const params: ReadwiseHighlightPromptParams = { 
      book_id: '123',
      page: 1,
      page_size: 10,
      task: 'summarize'
    };
    const result = prompt.validate(params);
    
    expect(result.success).toBe(true);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should validate parameters correctly - invalid page parameter', () => {
    const params: ReadwiseHighlightPromptParams = { 
      book_id: '123',
      page: 0, // Invalid - must be > 0
      page_size: 10
    };
    const result = prompt.validate(params);
    
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0].field).toBe('page');
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should validate parameters correctly - invalid task value', () => {
    const params = { 
      book_id: '123',
      task: 'invalid_task' as any // Cast to any to bypass type checking for test
    };
    const result = prompt.validate(params);
    
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0].field).toBe('task');
  });

  it('should execute successfully with valid parameters', async () => {
    const params: ReadwiseHighlightPromptParams = { 
      book_id: '123',
      page: 1,
      page_size: 10
    };
    
    const result = await prompt.execute(params);
    
    expect(result).toBeDefined();
    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBe(2); // System and user messages
    expect(mockReadwiseAPI.getHighlights).toHaveBeenCalledWith(params);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const params: ReadwiseHighlightPromptParams = { 
      book_id: '123',
      page: 1 
    };
    const apiError = new Error('API error');
    
    mockReadwiseAPI.getHighlights.mockRejectedValueOnce(apiError);
    
    await expect(prompt.execute(params)).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle unexpected errors gracefully', async () => {
    const params: ReadwiseHighlightPromptParams = { 
      book_id: '123'
    };
    const unexpectedError = new Error('Unexpected error');
    
    // Force an unexpected error
    mockReadwiseAPI.getHighlights.mockImplementationOnce(() => {
      throw unexpectedError;
    });
    
    await expect(prompt.execute(params)).rejects.toMatchObject({
      type: 'transport',
      details: {
        code: 'unexpected_error'
      }
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });
}); 