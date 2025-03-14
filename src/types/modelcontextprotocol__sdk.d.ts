declare module '@modelcontextprotocol/sdk' {
  export interface AuthorizationData {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  }

  export interface MCPOptions {
    manifest: any;
    authorize: (data?: AuthorizationData) => Promise<boolean>;
    getClient: (data: any) => Promise<any>;
  }

  export class MCP {
    constructor(options: MCPOptions);
    registerOpenAPI(spec: any, handlers: Record<string, Function>): void;
    createAuthorizationResponse(data: AuthorizationData): Promise<any>;
  }

  export function createExpressAdapter(mcp: MCP): any;
} 