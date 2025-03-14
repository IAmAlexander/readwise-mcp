import express, { Request, Response } from 'express';
import cors from 'cors';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const READWISE_API_BASE = 'https://readwise.io/api/v2';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Type definitions
interface MCPManifest {
  schema_version: string;
  name: string;
  name_for_human: string;
  description_for_human: string;
  description_for_model: string;
  auth: {
    type: string;
    client_url: string;
    scope: string;
    authorization_url: string;
    authorization_content_type: string;
  };
  api: {
    type: string;
    url: string;
  };
  logo_url: string;
  contact_email: string;
  legal_info_url: string;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  description: string;
  required?: boolean;
  schema: {
    type: string;
    default?: number;
    maximum?: number;
  };
}

interface OpenAPIPath {
  [path: string]: {
    get: {
      operationId: string;
      summary: string;
      description: string;
      parameters: OpenAPIParameter[];
      responses: {
        [statusCode: string]: {
          description: string;
          content?: {
            [contentType: string]: {
              schema: {
                type: string;
              };
            };
          };
        };
      };
    };
  };
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: {
    url: string;
    description: string;
  }[];
  paths: OpenAPIPath;
}

interface QueryParams {
  page?: number | string;
  page_size?: number | string;
  category?: string;
  book_id?: number | string;
  query?: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

// MCP Manifest
const manifest: MCPManifest = {
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
};

// OpenAPI Specification
const openApiSpec: OpenAPISpec = {
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
    "/recent": {
      get: {
        operationId: "getRecentContent",
        summary: "Get recent content",
        description: "Retrieves the most recently saved content from the user's Readwise library",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of recent items to retrieve",
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

// Serve the manifest
app.get('/manifest.json', (req: Request, res: Response) => {
  res.json(manifest);
});

// Serve the OpenAPI spec
app.get('/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Authentication routes
app.get('/auth/login', (req: Request, res: Response) => {
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
app.get('/auth/callback', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }
  
  try {
    // Validate the token with a basic request
    const testResponse: AxiosResponse = await axios.get(`${READWISE_API_BASE}/books/`, {
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
    const authResponse: AuthResponse = {
      access_token: token,
      token_type: 'bearer'
    };
    
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

// API endpoints
app.get('/books', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { page = 1, page_size = 20, category } = req.query as QueryParams;
    
    const params: QueryParams = { page, page_size };
    if (category) params.category = category;
    
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/books/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/highlights', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { page = 1, page_size = 20, book_id } = req.query as QueryParams;
    
    const params: QueryParams = { page, page_size };
    if (book_id) params.book_id = book_id;
    
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/highlights/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
});

app.get('/search', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { query } = req.query as QueryParams;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/search/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params: {
        query
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error searching Readwise:', error);
    res.status(500).json({ error: 'Failed to search Readwise' });
  }
});

app.get('/recent', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    
    // First get the most recent books
    const booksResponse: AxiosResponse = await axios.get(`${READWISE_API_BASE}/books/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params: {
        page_size: limit,
        order_by: 'created_at'
      }
    });
    
    // Then get the most recent highlights
    const highlightsResponse: AxiosResponse = await axios.get(`${READWISE_API_BASE}/highlights/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params: {
        page_size: limit,
        order_by: 'created_at'
      }
    });
    
    // Combine and sort by created_at
    const recentItems = [
      ...booksResponse.data.results.map((book: any) => ({
        ...book,
        type: 'book',
        created_at: new Date(book.created_at)
      })),
      ...highlightsResponse.data.results.map((highlight: any) => ({
        ...highlight,
        type: 'highlight',
        created_at: new Date(highlight.created_at)
      }))
    ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
     .slice(0, limit);
    
    res.json({
      count: recentItems.length,
      results: recentItems
    });
  } catch (error) {
    console.error('Error fetching recent content:', error);
    res.status(500).json({ error: 'Failed to fetch recent content' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Readwise MCP Server running on port ${PORT}`);
  console.log(`MCP Manifest available at: http://localhost:${PORT}/manifest.json`);
  console.log(`OpenAPI specification available at: http://localhost:${PORT}/openapi.json`);
}); 