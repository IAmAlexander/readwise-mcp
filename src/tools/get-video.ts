import { ReadwiseAPI } from '../api/readwise-api.js';
import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import type { Logger } from '../utils/logger-interface.js';
import { VideoDetailsResponse, MCPToolResult, isAPIError } from '../types/index.js';

export interface GetVideoParams {
  document_id: string;
}

export class GetVideoTool extends BaseMCPTool<GetVideoParams, VideoDetailsResponse> {
  readonly name = 'get_video';
  readonly description = 'Get video details by document ID';
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The Readwise document ID for the video'
      }
    },
    required: ['document_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  async execute(params: GetVideoParams): Promise<MCPToolResult<VideoDetailsResponse>> {
    try {
      this.logger.debug('Getting video details for document:', params.document_id as any);
      const result = await this.api.getVideo(params.document_id);
      this.logger.debug('Successfully retrieved video details:', result as any);
      return { result };
    } catch (error) {
      this.logger.error('Error getting video details:', error as any);
      if (isAPIError(error)) throw error;
      return { result: { id: params.document_id, title: '', url: '', author: '', tags: [], transcript: [] }, success: false, error: 'Failed to get video details' } as any;
    }
  }
} 