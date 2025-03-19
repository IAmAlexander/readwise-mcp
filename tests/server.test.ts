import { ReadwiseMCPServer } from '../src/server';
import { Logger } from '../src/utils/logger';
import { ReadwiseClient } from '../src/api/client';
import { ReadwiseAPI } from '../src/api/readwise-api';
import { GetBooksTool } from '../src/tools/get-books';
import { GetHighlightsTool } from '../src/tools/get-highlights';
import { GetDocumentsTool } from '../src/tools/get-documents';
import { SearchHighlightsTool } from '../src/tools/search-highlights';
import { ReadwiseHighlightPrompt } from '../src/prompts/highlight-prompt';
import { ReadwiseSearchPrompt } from '../src/prompts/search-prompt';
import { MCPRequest, MCPResponse, ErrorResponse } from '../src/types';

// Mock the required dependencies
jest.mock('../src/api/client');
jest.mock('../src/api/readwise-api');
jest.mock('../src/tools/get-books');
jest.mock('../src/tools/get-highlights');
jest.mock('../src/tools/get-documents');
jest.mock('../src/tools/search-highlights');
jest.mock('../src/prompts/highlight-prompt');
jest.mock('../src/prompts/search-prompt');

describe('ReadwiseMCPServer', () => {
  let server: ReadwiseMCPServer;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Reset all mocks
    jest.clearAllMocks();

    // Create the server
    server = new ReadwiseMCPServer('test-api-key', 3000, mockLogger, 'stdio');
  });

  it('should register all tools and prompts', () => {
    // Check if the tools and prompts were registered
    expect(GetBooksTool).toHaveBeenCalled();
    expect(GetHighlightsTool).toHaveBeenCalled();
    expect(GetDocumentsTool).toHaveBeenCalled();
    expect(SearchHighlightsTool).toHaveBeenCalled();
    expect(ReadwiseHighlightPrompt).toHaveBeenCalled();
    expect(ReadwiseSearchPrompt).toHaveBeenCalled();
  });

  it('should handle tool calls correctly', async () => {
    // Create a mock tool call
    const toolCall: MCPRequest & { type: 'tool_call' } = {
      type: 'tool_call',
      name: 'get_books',
      parameters: { page_size: 10 },
      request_id: 'test-request-id'
    };

    // Create a mock callback
    const callback = jest.fn();

    // Create a mock validate method for GetBooksTool
    const mockValidate = jest.fn().mockReturnValue({ success: true });
    const mockExecute = jest.fn().mockResolvedValue({ results: [] });
    
    // Set up the mock tool
    const mockTool = {
      name: 'get_books',
      validate: mockValidate,
      execute: mockExecute
    };
    
    // Mock the private method to get the tool
    Object.defineProperty(server, 'toolRegistry', {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(mockTool)
      })
    });

    // Call the handleMCPRequest method
    await server.handleMCPRequest(toolCall, callback);

    // Expect the validate and execute methods to be called
    expect(mockValidate).toHaveBeenCalledWith(toolCall.parameters);
    expect(mockExecute).toHaveBeenCalledWith(toolCall.parameters);
    
    // Expect the callback to be called with the result
    expect(callback).toHaveBeenCalledWith({ result: { results: [] } });
  });

  it('should handle validation errors in tool calls', async () => {
    // Create a mock tool call
    const toolCall: MCPRequest & { type: 'tool_call' } = {
      type: 'tool_call',
      name: 'get_books',
      parameters: { page: -1 }, // Invalid page
      request_id: 'test-request-id'
    };

    // Create a mock callback
    const callback = jest.fn();

    // Create a mock validate method that returns a validation error
    const mockValidate = jest.fn().mockReturnValue({
      success: false,
      errors: [{ field: 'page', message: 'Page must be at least 1' }]
    });
    
    // Set up the mock tool
    const mockTool = {
      name: 'get_books',
      validate: mockValidate,
      execute: jest.fn()
    };
    
    // Mock the private method to get the tool
    Object.defineProperty(server, 'toolRegistry', {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(mockTool)
      })
    });

    // Call the handleMCPRequest method
    await server.handleMCPRequest(toolCall, callback);

    // Expect the validate method to be called
    expect(mockValidate).toHaveBeenCalledWith(toolCall.parameters);
    
    // Expect the execute method not to be called
    expect(mockTool.execute).not.toHaveBeenCalled();
    
    // Expect the callback to be called with an error
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        type: 'validation'
      })
    }));
  });

  it('should handle non-existent tools correctly', async () => {
    // Create a mock tool call with a non-existent tool
    const toolCall: MCPRequest & { type: 'tool_call' } = {
      type: 'tool_call',
      name: 'non_existent_tool',
      parameters: {},
      request_id: 'test-request-id'
    };

    // Create a mock callback
    const callback = jest.fn();
    
    // Mock the toolRegistry.get method to return undefined
    Object.defineProperty(server, 'toolRegistry', {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(undefined)
      })
    });

    // Call the handleMCPRequest method
    await server.handleMCPRequest(toolCall, callback);
    
    // Expect the callback to be called with an error
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        type: 'transport',
        details: expect.objectContaining({
          code: 'tool_not_found'
        })
      })
    }));
  });

  it('should handle invalid request types correctly', async () => {
    // Create a mock request with an invalid type
    const invalidRequest = {
      type: 'invalid_type',
      name: 'get_books',
      parameters: {},
      request_id: 'test-request-id'
    };

    // Create a mock callback
    const callback = jest.fn();

    // Call the handleMCPRequest method
    await server.handleMCPRequest(invalidRequest as any, callback);
    
    // Expect the callback to be called with an error
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        type: 'transport',
        details: expect.objectContaining({
          code: 'invalid_request_type'
        })
      })
    }));
  });
}); 