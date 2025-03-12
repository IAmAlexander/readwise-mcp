// index.js - Readwise MCP Server for Smithery
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { smithery } = require('smithery');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Readwise API Configuration
const READWISE_API_BASE = 'https://readwise.io/api/v2';

// MCP Configuration
const mcpConfig = {
  schema_version: "v1",
  name: "Readwise",
  name_for_human: "Readwise",
  description_for_human: "Access your Readwise library, including articles, books, highlights, and documents.",
  description_for_model: "This tool allows access to the user's Readwise library, including saved articles, books, highlights, and documents. Use this to retrieve information the user has saved in Readwise for reference or analysis.",
  auth: {
    type: "oauth",
    client_url: "/auth/login",
    scope: "", // Readwise API uses token-based auth, not OAuth scopes
    authorization_url: "https://readwise.io/access_token", // This is where users get their token
    authorization_content_type: "application/json"
  },
  api: {
    type: "openapi",
    url: "/openapi.json" 
  },
  logo_url: "https://readwise.io/static/img/readwise.png",
  contact_email: "your-email@example.com",
  legal_info_url: "https://readwise.io/terms"
};

// Smithery setup
const mcp = smithery({
  manifest: mcpConfig,
  // Create authenticated client for API calls
  getClient: async (req, auth) => {
    // Auth token is stored in the auth object by Smithery after user login
    if (!auth?.access_token) {
      throw new Error('No Readwise token available');
    }
    
    return axios.create({
      baseURL: READWISE_API_BASE,
      headers: {
        'Authorization': `Token ${auth.access_token}`,
        'Content-Type': 'application/json'
      }
    });
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

// Handle auth callback - convert token to the format Smithery expects
app.get('/auth/callback', mcp.handleAuthCallback({
  // Transform the query parameters into an auth object
  getAuthFromRequest: (req) => {
    const token = req.query.token;
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Return auth object in the format Smithery expects
    return {
      access_token: token,
      token_type: 'bearer'
    };
  }
}));

// OpenAPI specification
app.get('/openapi.json', (req, res) => {
  const openapi = {
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
                    type: "object",
                    properties: {
                      count: {
                        type: "integer"
                      },
                      next: {
                        type: "string",
                        nullable: true
                      },
                      previous: {
                        type: "string",
                        nullable: true
                      },
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "integer"
                            },
                            title: {
                              type: "string"
                            },
                            author: {
                              type: "string"
                            },
                            category: {
                              type: "string"
                            },
                            source: {
                              type: "string"
                            },
                            num_highlights: {
                              type: "integer"
                            },
                            updated: {
                              type: "string",
                              format: "date-time"
                            }
                          }
                        }
                      }
                    }
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
                    type: "object",
                    properties: {
                      id: {
                        type: "integer"
                      },
                      title: {
                        type: "string"
                      },
                      author: {
                        type: "string"
                      },
                      category: {
                        type: "string"
                      },
                      source: {
                        type: "string"
                      },
                      num_highlights: {
                        type: "integer"
                      },
                      updated: {
                        type: "string",
                        format: "date-time"
                      },
                      highlights: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "integer"
                            },
                            text: {
                              type: "string"
                            },
                            note: {
                              type: "string"
                            },
                            location: {
                              type: "integer"
                            },
                            highlighted_at: {
                              type: "string",
                              format: "date-time"
                            }
                          }
                        }
                      }
                    }
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
            },
            {
              name: "updated__gt",
              in: "query",
              description: "Filter by updated date (greater than)",
              schema: {
                type: "string",
                format: "date-time"
              }
            },
            {
              name: "highlighted_at__gt",
              in: "query",
              description: "Filter by highlight date (greater than)",
              schema: {
                type: "string",
                format: "date-time"
              }
            }
          ],
          responses: {
            "200": {
              description: "Successful operation",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: {
                        type: "integer"
                      },
                      next: {
                        type: "string",
                        nullable: true
                      },
                      previous: {
                        type: "string",
                        nullable: true
                      },
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "integer"
                            },
                            text: {
                              type: "string"
                            },
                            note: {
                              type: "string"
                            },
                            location: {
                              type: "integer"
                            },
                            book_id: {
                              type: "integer"
                            },
                            book_title: {
                              type: "string"
                            },
                            highlighted_at: {
                              type: "string",
                              format: "date-time"
                            },
                            updated: {
                              type: "string",
                              format: "date-time"
                            }
                          }
                        }
                      }
                    }
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
            },
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
            }
          ],
          responses: {
            "200": {
              description: "Successful operation",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: {
                        type: "integer"
                      },
                      next: {
                        type: "string",
                        nullable: true
                      },
                      previous: {
                        type: "string",
                        nullable: true
                      },
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "integer"
                            },
                            text: {
                              type: "string"
                            },
                            note: {
                              type: "string"
                            },
                            book_id: {
                              type: "integer"
                            },
                            book_title: {
                              type: "string"
                            },
                            score: {
                              type: "number"
                            }
                          }
                        }
                      }
                    }
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
                    type: "object",
                    properties: {
                      recent_books: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "integer"
                            },
                            title: {
                              type: "string"
                            },
                            author: {
                              type: "string"
                            },
                            category: {
                              type: "string"
                            },
                            added_at: {
                              type: "string",
                              format: "date-time"
                            }
                          }
                        }
                      },
                      recent_highlights: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "integer"
                            },
                            text: {
                              type: "string"
                            },
                            book_id: {
                              type: "integer"
                            },
                            book_title: {
                              type: "string"
                            },
                            highlighted_at: {
                              type: "string",
                              format: "date-time"
                            }
                          }
                        }
                      }
                    }
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
  
  res.json(openapi);
});

// MCP API Implementation using Smithery
// Books endpoint
app.get('/books', mcp.createHandler(async (req, client) => {
  const { page = 1, page_size = 20, category } = req.query;
  
  const params = { page, page_size };
  if (category) params.category = category;
  
  const response = await client.get('/books/', { params });
  return response.data;
}));

// Single book endpoint
app.get('/books/:book_id', mcp.createHandler(async (req, client) => {
  const { book_id } = req.params;
  
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
}));

// Highlights endpoint
app.get('/highlights', mcp.createHandler(async (req, client) => {
  const { 
    page = 1, 
    page_size = 20,
    book_id,
    updated__gt,
    highlighted_at__gt
  } = req.query;
  
  const params = { page, page_size };
  
  // Add optional filters if provided
  if (book_id) params.book_id = book_id;
  if (updated__gt) params.updated__gt = updated__gt;
  if (highlighted_at__gt) params.highlighted_at__gt = highlighted_at__gt;
  
  const response = await client.get('/highlights/', { params });
  return response.data;
}));

// Search endpoint
app.get('/search', mcp.createHandler(async (req, client) => {
  const { query, page = 1, page_size = 20 } = req.query;
  
  if (!query) {
    throw new Error('Search query is required');
  }
  
  // Call Readwise search endpoint
  const response = await client.get('/search/', {
    params: {
      query,
      page,
      page_size
    }
  });
  
  return response.data;
}));

// Recent content endpoint
app.get('/recent-content', mcp.createHandler(async (req, client) => {
  const { limit = 10 } = req.query;
  
  // Get recent books
  const booksResponse = await client.get('/books/', {
    params: {
      page: 1,
      page_size: limit,
      order_by: '-updated'
    }
  });
  
  // Get recent highlights
  const highlightsResponse = await client.get('/highlights/', {
    params: {
      page: 1,
      page_size: limit,
      order_by: '-highlighted_at'
    }
  });
  
  return {
    recent_books: booksResponse.data.results,
    recent_highlights: highlightsResponse.data.results
  };
}));

// Add Smithery middleware
app.use(mcp.errorHandler());

// Start server or export for hosting platforms that handle that for us
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Readwise MCP Server running on port ${PORT}`);
    console.log(`MCP Manifest available at: http://localhost:${PORT}/manifest.json`);
  });
}

module.exports = app;