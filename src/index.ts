// Use CommonJS require instead of ESM import
const sdk = require('@modelcontextprotocol/sdk');
const { MCP, createExpressAdapter } = sdk;
import express from 'express';
import axios, { AxiosInstance } from 'axios';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Define AuthorizationData type
interface AuthorizationData {
  access_token?: string;
  [key: string]: any;
}

// Define types for client and request
interface Client {
  get: (url: string, config?: any) => Promise<any>;
}

interface Request {
  query: Record<string, any>;
  params: Record<string, any>;
}

// Configuration
const PORT = process.env.PORT || 3000;
const READWISE_API_BASE = 'https://readwise.io/api/v2';

// Storage for API tokens
const tokenStore = new Map<string, string>();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Setup MCP Server
const mcp = new MCP({
  manifest: {
    schema_version: "v1",
    name: "Readwise",
    name_for_human: "Readwise",
    description_for_human: "Access your Readwise library, including articles, books, highlights, and documents.",
    description_for_model: "This tool allows access to the user's Readwise library, including saved articles, books, highlights, and documents. Use this to retrieve information the user has saved in Readwise for reference or analysis.",
    auth: {
      type: "oauth",
      client_url: "/auth/login",
      scope: "",
      authorization_url: "https://readwise.io/access_token",
      authorization_content_type: "application/json"
    },
    api: {
      type: "openapi",
      url: "/openapi.json"
    },
    logo_url: "https://readwise.io/static/img/readwise.png",
    contact_email: "iamalexander@users.noreply.github.com",
    legal_info_url: "https://readwise.io/terms"
  },
  authorize: async (data?: AuthorizationData) => {
    // For lazy loading, always return true during initialization
    // The actual validation will happen when a tool is called
    if (!data?.access_token) {
      // No token provided, but we'll still return true for lazy loading
      return true;
    }
    
    // If a token is provided, validate it with Readwise
    try {
      const response = await axios.get(`${READWISE_API_BASE}/books/`, {
        headers: {
          Authorization: `Token ${data.access_token}`,
        },
        params: {
          page_size: 1
        }
      });
      
      // If the request was successful, the token is valid
      return response.status === 200;
    } catch (error) {
      console.error('Token validation error:', error);
      // Still return true for lazy loading, we'll handle errors during tool calls
      return true;
    }
  },
  async getClient(data: { access_token?: string }) {
    if (!data?.access_token) {
      // For lazy loading, return a client that will prompt for authentication when used
      return {
        client: {
          get: async (url: string, config?: any) => {
            // When a tool is called without a token, throw a specific error
            // that will trigger the authentication flow
            throw new Error('Authentication required');
          }
        },
        sessionData: { needsAuth: true }
      };
    }
    
    // Create and return an Axios instance for Readwise API calls
    return {
      client: axios.create({
        baseURL: READWISE_API_BASE,
        headers: {
          Authorization: `Token ${data.access_token}`,
          'Content-Type': 'application/json'
        }
      }),
      // Store the token for potential reuse
      sessionData: { token: data.access_token }
    };
  }
});

// OpenAPI Specification
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Readwise MCP API",
    description: "API for accessing Readwise data following Model Context Protocol",
    version: "1.0.0"
  },
  servers: [
    {
      url: "",
      description: "Readwise API (via MCP server)"
    }
  ],
  paths: {
    "/books": {
      get: {
        operationId: "listBooks",
        summary: "List user's books and articles",
        description: "Retrieves a list of books and articles from the user's Readwise library",
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            schema: {
              type: "integer",
              default: 1
            }
          },
          {
            name: "page_size",
            in: "query",
            description: "Number of items per page",
            schema: {
              type: "integer",
              default: 20,
              maximum: 100
            }
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category (book, article, tweet, etc.)",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "401": {
            description: "Unauthorized - Invalid token"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/books/{book_id}": {
      get: {
        operationId: "getBook",
        summary: "Get a specific book or article",
        description: "Retrieves details about a specific book or article from the user's Readwise library",
        parameters: [
          {
            name: "book_id",
            in: "path",
            required: true,
            description: "ID of the book to retrieve",
            schema: {
              type: "integer"
            }
          }
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "404": {
            description: "Book not found"
          },
          "401": {
            description: "Unauthorized - Invalid token"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/highlights": {
      get: {
        operationId: "listHighlights",
        summary: "List user's highlights",
        description: "Retrieves a list of highlights from the user's Readwise library",
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            schema: {
              type: "integer",
              default: 1
            }
          },
          {
            name: "page_size",
            in: "query",
            description: "Number of items per page",
            schema: {
              type: "integer",
              default: 20,
              maximum: 100
            }
          },
          {
            name: "book_id",
            in: "query",
            description: "Filter by book ID",
            schema: {
              type: "integer"
            }
          }
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "401": {
            description: "Unauthorized - Invalid token"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/search": {
      get: {
        operationId: "searchReadwise",
        summary: "Search Readwise content",
        description: "Searches across all content in the user's Readwise library",
        parameters: [
          {
            name: "query",
            in: "query",
            required: true,
            description: "Search query",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "401": {
            description: "Unauthorized - Invalid token"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/recent-content": {
      get: {
        operationId: "getRecentContent",
        summary: "Get user's recent content",
        description: "Retrieves recently added content from the user's Readwise library",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of items to return",
            schema: {
              type: "integer",
              default: 10,
              maximum: 50
            }
          }
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "401": {
            description: "Unauthorized - Invalid token"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    }
  }
};

// Register API Endpoints
mcp.registerOpenAPI(openApiSpec, {
  // List books endpoint
  listBooks: async ({ client }: { client: Client }, request: Request) => {
    try {
      const { page = 1, page_size = 20, category } = request.query;
      
      const params: Record<string, any> = { page, page_size };
      if (category) params.category = category;
      
      const response = await client.get('/books/', { params });
      return response.data;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        // Provide a helpful error message for users
        throw new Error('Please authenticate with your Readwise account to access your books. You can get your API token from https://readwise.io/access_token');
      }
      // Re-throw other errors
      throw error;
    }
  },
  
  // Get a specific book
  getBook: async ({ client }: { client: Client }, request: Request) => {
    try {
      const { book_id } = request.params;
      
      // Get book details
      const bookResponse = await client.get(`/books/${book_id}`);
      
      // Get highlights for this book
      const highlightsResponse = await client.get('/highlights/', {
        params: {
          book_id,
          page_size: 100
        }
      });
      
      // Combine the data
      const book = bookResponse.data;
      book.highlights = highlightsResponse.data.results;
      
      return book;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        // Provide a helpful error message for users
        throw new Error('Please authenticate with your Readwise account to access your books. You can get your API token from https://readwise.io/access_token');
      }
      // Re-throw other errors
      throw error;
    }
  },
  
  // List highlights
  listHighlights: async ({ client }: { client: Client }, request: Request) => {
    try {
      const { 
        page = 1, 
        page_size = 20,
        book_id,
        updated__gt,
        highlighted_at__gt
      } = request.query;
      
      const params: Record<string, any> = { page, page_size };
      
      // Add optional filters if provided
      if (book_id) params.book_id = book_id;
      if (updated__gt) params.updated__gt = updated__gt;
      if (highlighted_at__gt) params.highlighted_at__gt = highlighted_at__gt;
      
      const response = await client.get('/highlights/', { params });
      return response.data;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        // Provide a helpful error message for users
        throw new Error('Please authenticate with your Readwise account to access your highlights. You can get your API token from https://readwise.io/access_token');
      }
      // Re-throw other errors
      throw error;
    }
  },
  
  // Search Readwise
  searchReadwise: async ({ client }: { client: Client }, request: Request) => {
    try {
      const { query, page = 1, page_size = 20 } = request.query;
      
      if (!query) {
        throw new Error('Search query is required');
      }
      
      const response = await client.get('/search/', {
        params: {
          query,
          page,
          page_size
        }
      });
      
      return response.data;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        // Provide a helpful error message for users
        throw new Error('Please authenticate with your Readwise account to search your content. You can get your API token from https://readwise.io/access_token');
      }
      // Re-throw other errors
      throw error;
    }
  },
  
  // Get a specific highlight
  getHighlight: async ({ client }: { client: Client }, request: Request) => {
    try {
      const { highlight_id } = request.params;
      
      const response = await client.get(`/highlights/${highlight_id}`);
      return response.data;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        // Provide a helpful error message for users
        throw new Error('Please authenticate with your Readwise account to access your highlights. You can get your API token from https://readwise.io/access_token');
      }
      // Re-throw other errors
      throw error;
    }
  },
  
  // Get recent content
  getRecentContent: async ({ client }: { client: Client }, request: Request) => {
    try {
      const { limit = 10 } = request.query;
      
      // Get recent books
      const booksResponse = await client.get('/books/', {
        params: {
          page_size: limit
        }
      });
      
      // Get recent highlights
      const highlightsResponse = await client.get('/highlights/', {
        params: {
          page_size: limit
        }
      });
      
      // Combine the data
      return {
        recent_books: booksResponse.data.results,
        recent_highlights: highlightsResponse.data.results
      };
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        // Provide a helpful error message for users
        throw new Error('Please authenticate with your Readwise account to access your recent content. You can get your API token from https://readwise.io/access_token');
      }
      // Re-throw other errors
      throw error;
    }
  }
});

// Authentication routes
app.get('/auth/login', (req, res) => {
  // Show a simple form for entering Readwise API token
  res.send(`
    <html>
      <head>
        <title>Connect your Readwise account</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
          .container { background: #f8f9fa; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h1 { color: #333; }
          p { color: #666; line-height: 1.5; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #4285f4; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
          button:hover { background: #3b78e7; }
          .instructions { background: #e9f5ff; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .instructions a { color: #4285f4; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Connect your Readwise account</h1>
          
          <div class="instructions">
            <p>To connect your Readwise account, you'll need to provide your API token.</p>
            <p>You can find your Readwise token at <a href="https://readwise.io/access_token" target="_blank">https://readwise.io/access_token</a></p>
          </div>
          
          <form id="tokenForm">
            <div class="form-group">
              <label for="token">Your Readwise API Token:</label>
              <input type="text" id="token" name="token" required>
            </div>
            <button type="submit">Connect Account</button>
          </form>
        </div>
        
        <script>
          document.getElementById('tokenForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('token').value.trim();
            
            // Send token to our callback endpoint
            window.location.href = '/auth/callback?token=' + encodeURIComponent(token);
          });
        </script>
      </body>
    </html>
  `);
});

// Handle auth callback
app.get('/auth/callback', async (req, res) => {
  const token = req.query.token as string;
  
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }
  
  try {
    // Validate the token with a basic request
    const testResponse = await axios.get(`${READWISE_API_BASE}/books/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params: {
        page_size: 1
      }
    });
    
    if (testResponse.status !== 200) {
      throw new Error('Invalid token');
    }
    
    // Create the authorization response
    const authResponse = await mcp.createAuthorizationResponse({
      access_token: token,
      token_type: 'bearer'
    });
    
    // Return success page with the authorization details
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center; }
            .container { background: #f8f9fa; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 50px; }
            h1 { color: #333; }
            p { color: #666; line-height: 1.5; }
            .success { color: #28a745; font-weight: bold; }
            .code { background: #e9f5ff; padding: 10px; border-radius: 4px; font-family: monospace; margin: 20px 0; overflow-wrap: break-word; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Successful</h1>
            <p class="success">Your Readwise account has been connected successfully!</p>
            <p>You can now close this window and return to your application.</p>
            <div class="code">${JSON.stringify(authResponse)}</div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).send(`
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center; }
            .container { background: #f8f9fa; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 50px; }
            h1 { color: #dc3545; }
            p { color: #666; line-height: 1.5; }
            .error { color: #dc3545; }
            .button { display: inline-block; background: #4285f4; color: white; text-decoration: none; padding: 10px 15px; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Failed</h1>
            <p class="error">The provided token appears to be invalid.</p>
            <p>Please check your Readwise API token and try again.</p>
            <a href="/auth/login" class="button">Try Again</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Expose the MCP endpoints
const adapter = createExpressAdapter(mcp);
app.use(adapter);

// Start the server
app.listen(PORT, () => {
  console.log(`Readwise MCP Server running on port ${PORT}`);
  console.log(`MCP Manifest available at: http://localhost:${PORT}/manifest.json`);
  console.log(`OpenAPI specification available at: http://localhost:${PORT}/openapi.json`);
});