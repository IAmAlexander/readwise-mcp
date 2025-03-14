import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios, { AxiosResponse, AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';

// Check if running under MCP Inspector
const isMCPInspector = process.env.MCP_INSPECTOR === 'true' || 
                       process.argv.includes('--mcp-inspector') ||
                       process.env.NODE_ENV === 'mcp-inspector';

// Configuration
const PORT = isMCPInspector ? 0 : (process.env.PORT || 3000); // Use port 0 (random available port) when run through MCP Inspector
const READWISE_API_BASE = 'https://readwise.io/api/v2';
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 100; // Maximum requests per minute

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Status endpoint
app.get('/status', (req, res) => {
  // Calculate rate limit info
  const now = Date.now();
  const timeElapsed = now - rateLimitTracker.windowStart;
  const timeRemaining = Math.max(0, RATE_LIMIT_WINDOW - timeElapsed);
  const resetTime = new Date(now + timeRemaining).toISOString();
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitTracker.requestCount);
  
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    rate_limit: {
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: remaining,
      reset: resetTime,
      queue_length: rateLimitTracker.queue.length
    }
  });
});

// Rate limiting implementation
interface RateLimitTracker {
  windowStart: number;
  requestCount: number;
  queue: Array<() => Promise<any>>;
  processing: boolean;
}

const rateLimitTracker: RateLimitTracker = {
  windowStart: Date.now(),
  requestCount: 0,
  queue: [],
  processing: false
};

// Process the queue of delayed requests
async function processQueue() {
  if (rateLimitTracker.processing || rateLimitTracker.queue.length === 0) {
    return;
  }
  
  rateLimitTracker.processing = true;
  
  try {
    // Reset window if needed
    const now = Date.now();
    if (now - rateLimitTracker.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitTracker.windowStart = now;
      rateLimitTracker.requestCount = 0;
    }
    
    // Process requests if we're under the limit
    while (rateLimitTracker.queue.length > 0 && rateLimitTracker.requestCount < MAX_REQUESTS_PER_WINDOW) {
      const request = rateLimitTracker.queue.shift();
      if (request) {
        rateLimitTracker.requestCount++;
        await request();
      }
    }
    
    // If we still have items in the queue, schedule processing after window resets
    if (rateLimitTracker.queue.length > 0) {
      const timeToNextWindow = RATE_LIMIT_WINDOW - (Date.now() - rateLimitTracker.windowStart);
      setTimeout(processQueue, timeToNextWindow + 100); // Add a small buffer
    }
  } finally {
    rateLimitTracker.processing = false;
  }
}

// Middleware to handle rate limiting
function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for non-API requests
  if (!req.path.startsWith('/books') && 
      !req.path.startsWith('/highlights') && 
      !req.path.startsWith('/search') && 
      !req.path.startsWith('/document') && 
      !req.path.startsWith('/bulk') && 
      !req.path.startsWith('/tags') && 
      !req.path.startsWith('/reading-list') && 
      !req.path.startsWith('/recent') && 
      !req.path.startsWith('/save') && 
      !req.path.startsWith('/update') && 
      !req.path.startsWith('/delete')) {
    return next();
  }
  
  // Check if we need to reset the window
  const now = Date.now();
  if (now - rateLimitTracker.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitTracker.windowStart = now;
    rateLimitTracker.requestCount = 0;
  }
  
  // If we're under the limit, process immediately
  if (rateLimitTracker.requestCount < MAX_REQUESTS_PER_WINDOW) {
    rateLimitTracker.requestCount++;
    return next();
  }
  
  // Otherwise, queue the request
  const originalSend = res.send;
  
  // Create a promise that will be resolved when the request is processed
  const requestPromise = new Promise<void>((resolve) => {
    // Override res.send to resolve the promise when the response is sent
    res.send = function(body) {
      res.send = originalSend;
      resolve();
      return originalSend.call(this, body);
    };
    
    // Add the request to the queue
    rateLimitTracker.queue.push(async () => {
      next();
      // Wait for the response to be sent
      await new Promise(resolve => {
        const checkSent = setInterval(() => {
          if (res.headersSent) {
            clearInterval(checkSent);
            resolve(true);
          }
        }, 50);
      });
    });
    
    // Start processing the queue if it's not already being processed
    if (!rateLimitTracker.processing) {
      processQueue();
    }
  });
  
  // Add rate limit headers
  const timeToNextWindow = RATE_LIMIT_WINDOW - (now - rateLimitTracker.windowStart);
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Reset', Math.ceil(timeToNextWindow / 1000).toString());
  res.setHeader('Retry-After', Math.ceil(timeToNextWindow / 1000).toString());
}

// Apply rate limiting middleware
app.use(rateLimitMiddleware);

// Helper function to handle API requests with rate limit awareness
async function makeReadwiseRequest(
  method: string, 
  endpoint: string, 
  token: string, 
  data?: any, 
  params?: any
): Promise<AxiosResponse> {
  try {
    const config: any = {
      method,
      url: `${READWISE_API_BASE}${endpoint}`,
      headers: {
        Authorization: `Token ${token}`
      }
    };
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    if (params) {
      config.params = params;
    }
    
    return await axios(config);
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Handle rate limiting from Readwise API
    if (axiosError.response?.status === 429) {
      const retryAfter = parseInt(axiosError.response.headers['retry-after'] || '60', 10);
      console.log(`Rate limited by Readwise API. Retrying after ${retryAfter} seconds.`);
      
      // Wait for the specified time and retry
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return makeReadwiseRequest(method, endpoint, token, data, params);
    }
    
    throw error;
  }
}

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
    default?: number | boolean;
    maximum?: number;
  };
}

interface OpenAPIPath {
  [path: string]: {
    get?: {
      operationId: string;
      summary: string;
      description: string;
      parameters?: OpenAPIParameter[];
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
    post?: {
      operationId: string;
      summary: string;
      description: string;
      parameters?: OpenAPIParameter[];
      requestBody?: {
        required: boolean;
        content: {
          [contentType: string]: {
            schema: {
              type: string;
              properties: {
                [property: string]: any;
              };
              required?: string[];
            };
          };
        };
      };
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
    patch?: {
      operationId: string;
      summary: string;
      description: string;
      parameters?: OpenAPIParameter[];
      requestBody?: {
        required: boolean;
        content: {
          [contentType: string]: {
            schema: {
              type: string;
              properties: {
                [property: string]: any;
              };
              required?: string[];
            };
          };
        };
      };
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
    delete?: {
      operationId: string;
      summary: string;
      description: string;
      parameters?: OpenAPIParameter[];
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
    put?: {
      operationId: string;
      summary: string;
      description: string;
      parameters?: OpenAPIParameter[];
      requestBody?: {
        required: boolean;
        content: {
          [contentType: string]: {
            schema: {
              type: string;
              properties: {
                [property: string]: any;
              };
              required?: string[];
            };
          };
        };
      };
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
  limit?: number | string;
  location?: string;
  updatedAfter?: string;
  pageCursor?: string;
  withHtmlContent?: boolean | string;
  // Advanced search parameters
  tags?: string | string[];
  author?: string;
  title?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  // Reading progress parameters
  progressStatus?: string;
  progressPercentage?: number | string;
  status?: string; // For reading list filtering
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
          },
          {
            name: "location",
            in: "query",
            description: "Filter by location (new, later, archive, feed)",
            schema: {
              type: "string"
            }
          },
          {
            name: "updatedAfter",
            in: "query",
            description: "Filter by documents updated after this date (ISO 8601 format)",
            schema: {
              type: "string"
            }
          },
          {
            name: "pageCursor",
            in: "query",
            description: "Cursor for pagination (from previous response)",
            schema: {
              type: "string"
            }
          },
          {
            name: "withHtmlContent",
            in: "query",
            description: "Include HTML content in the response",
            schema: {
              type: "boolean",
              default: false
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
    },
    "/save": {
      post: {
        operationId: "saveContent",
        summary: "Save new content to Readwise",
        description: "Saves a new article, webpage, or note to the user's Readwise library",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  url: { 
                    type: "string", 
                    description: "URL of the content to save" 
                  },
                  title: { 
                    type: "string", 
                    description: "Optional title override" 
                  },
                  author: { 
                    type: "string", 
                    description: "Optional author override" 
                  },
                  html: { 
                    type: "string", 
                    description: "Optional HTML content if not scraping from URL" 
                  },
                  tags: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Tags to apply to the saved content"
                  },
                  summary: { 
                    type: "string", 
                    description: "Optional summary of the content" 
                  },
                  notes: { 
                    type: "string", 
                    description: "Optional notes about the content" 
                  },
                  location: { 
                    type: "string", 
                    description: "Where to save the content (new, later, archive, feed)" 
                  }
                },
                required: ["url"]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Content saved successfully",
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
    "/update/{document_id}": {
      patch: {
        operationId: "updateDocument",
        summary: "Update document metadata",
        description: "Updates metadata for an existing document in Readwise",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document to update",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { 
                    type: "string", 
                    description: "New title for the document" 
                  },
                  author: { 
                    type: "string", 
                    description: "New author for the document" 
                  },
                  summary: { 
                    type: "string", 
                    description: "New summary for the document" 
                  },
                  published_date: { 
                    type: "string", 
                    description: "New published date in ISO 8601 format" 
                  },
                  image_url: { 
                    type: "string", 
                    description: "New cover image URL" 
                  },
                  location: { 
                    type: "string", 
                    description: "New location (new, later, archive, feed)" 
                  },
                  category: { 
                    type: "string", 
                    description: "New category (article, email, rss, etc.)" 
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Document updated successfully",
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
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/delete/{document_id}": {
      delete: {
        operationId: "deleteDocument",
        summary: "Delete a document",
        description: "Deletes a document from the user's Readwise library",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document to delete",
            schema: {
              type: "string"
            }
          },
          {
            name: "confirm",
            in: "query",
            required: true,
            description: "Confirmation string. Must be 'yes' to confirm deletion.",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "204": {
            description: "Document deleted successfully"
          },
          "400": {
            description: "Missing confirmation"
          },
          "401": {
            description: "Unauthorized - Invalid token"
          },
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/tags": {
      get: {
        operationId: "listTags",
        summary: "List all tags",
        description: "Retrieves a list of all tags used in the user's Readwise library",
        parameters: [],
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
    "/document/{document_id}/tags": {
      get: {
        operationId: "getDocumentTags",
        summary: "Get tags for a document",
        description: "Retrieves all tags associated with a specific document",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document",
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
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      },
      put: {
        operationId: "updateDocumentTags",
        summary: "Update tags for a document",
        description: "Updates the tags associated with a specific document",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of tags to set for the document"
                  }
                },
                required: ["tags"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Tags updated successfully",
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
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/document/{document_id}/tags/{tag}": {
      post: {
        operationId: "addTagToDocument",
        summary: "Add a tag to a document",
        description: "Adds a specific tag to a document",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document",
            schema: {
              type: "string"
            }
          },
          {
            name: "tag",
            in: "path",
            required: true,
            description: "Tag to add",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Tag added successfully",
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
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      },
      delete: {
        operationId: "removeTagFromDocument",
        summary: "Remove a tag from a document",
        description: "Removes a specific tag from a document",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document",
            schema: {
              type: "string"
            }
          },
          {
            name: "tag",
            in: "path",
            required: true,
            description: "Tag to remove",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Tag removed successfully",
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
          "404": {
            description: "Document not found or tag not found on document"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/search/advanced": {
      get: {
        operationId: "advancedSearch",
        summary: "Advanced search",
        description: "Performs an advanced search across the user's Readwise library with multiple filtering options",
        parameters: [
          {
            name: "query",
            in: "query",
            description: "Search query text",
            schema: {
              type: "string"
            }
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category (book, article, tweet, etc.)",
            schema: {
              type: "string"
            }
          },
          {
            name: "tags",
            in: "query",
            description: "Filter by tags (comma-separated list)",
            schema: {
              type: "string"
            }
          },
          {
            name: "author",
            in: "query",
            description: "Filter by author",
            schema: {
              type: "string"
            }
          },
          {
            name: "title",
            in: "query",
            description: "Filter by title",
            schema: {
              type: "string"
            }
          },
          {
            name: "location",
            in: "query",
            description: "Filter by location (new, later, archive, feed)",
            schema: {
              type: "string"
            }
          },
          {
            name: "dateFrom",
            in: "query",
            description: "Filter by date from (ISO 8601 format)",
            schema: {
              type: "string"
            }
          },
          {
            name: "dateTo",
            in: "query",
            description: "Filter by date to (ISO 8601 format)",
            schema: {
              type: "string"
            }
          },
          {
            name: "sortBy",
            in: "query",
            description: "Sort by field (created_at, updated_at, title, author)",
            schema: {
              type: "string"
            }
          },
          {
            name: "sortOrder",
            in: "query",
            description: "Sort order (asc, desc)",
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
          },
          {
            name: "pageCursor",
            in: "query",
            description: "Cursor for pagination (from previous response)",
            schema: {
              type: "string"
            }
          },
          {
            name: "withHtmlContent",
            in: "query",
            description: "Include HTML content in the response",
            schema: {
              type: "boolean",
              default: false
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
    "/document/{document_id}/progress": {
      get: {
        operationId: "getReadingProgress",
        summary: "Get reading progress",
        description: "Retrieves the reading progress for a specific document",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document",
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
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      },
      put: {
        operationId: "updateReadingProgress",
        summary: "Update reading progress",
        description: "Updates the reading progress for a specific document",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the document",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    description: "Reading status (not_started, in_progress, completed)"
                  },
                  percentage: {
                    type: "number",
                    description: "Reading progress percentage (0-100)"
                  },
                  current_page: {
                    type: "number",
                    description: "Current page number"
                  },
                  total_pages: {
                    type: "number",
                    description: "Total number of pages"
                  },
                  last_read_at: {
                    type: "string",
                    description: "ISO 8601 timestamp of when the document was last read"
                  }
                },
                required: ["status"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Progress updated successfully",
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
          "404": {
            description: "Document not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/reading-list": {
      get: {
        operationId: "getReadingList",
        summary: "Get reading list",
        description: "Retrieves the user's reading list with progress information",
        parameters: [
          {
            name: "status",
            in: "query",
            description: "Filter by reading status (not_started, in_progress, completed)",
            schema: {
              type: "string"
            }
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category (book, article, tweet, etc.)",
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
    "/bulk/save": {
      post: {
        operationId: "bulkSaveContent",
        summary: "Save multiple items to Readwise",
        description: "Saves multiple articles, webpages, or notes to the user's Readwise library in a single request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        url: { 
                          type: "string", 
                          description: "URL of the content to save" 
                        },
                        title: { 
                          type: "string", 
                          description: "Optional title override" 
                        },
                        author: { 
                          type: "string", 
                          description: "Optional author override" 
                        },
                        html: { 
                          type: "string", 
                          description: "Optional HTML content if not scraping from URL" 
                        },
                        tags: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Tags to apply to the saved content"
                        },
                        summary: { 
                          type: "string", 
                          description: "Optional summary of the content" 
                        },
                        notes: { 
                          type: "string", 
                          description: "Optional notes about the content" 
                        },
                        location: { 
                          type: "string", 
                          description: "Where to save the content (new, later, archive, feed)" 
                        }
                      },
                      required: ["url"]
                    }
                  },
                  confirmation: {
                    type: "string",
                    description: "Confirmation string. Must be 'I confirm saving these items' to proceed."
                  }
                },
                required: ["items", "confirmation"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Bulk save operation results",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "400": {
            description: "Missing or invalid confirmation"
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
    "/bulk/update": {
      post: {
        operationId: "bulkUpdateDocuments",
        summary: "Update multiple documents",
        description: "Updates metadata for multiple documents in a single request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  updates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        document_id: { 
                          type: "string", 
                          description: "ID of the document to update" 
                        },
                        title: { 
                          type: "string", 
                          description: "New title for the document" 
                        },
                        author: { 
                          type: "string", 
                          description: "New author for the document" 
                        },
                        summary: { 
                          type: "string", 
                          description: "New summary for the document" 
                        },
                        tags: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "New tags for the document"
                        },
                        location: { 
                          type: "string", 
                          description: "New location (new, later, archive, feed)" 
                        },
                        category: { 
                          type: "string", 
                          description: "New category (article, email, rss, etc.)" 
                        }
                      },
                      required: ["document_id"]
                    }
                  },
                  confirmation: {
                    type: "string",
                    description: "Confirmation string. Must be 'I confirm these updates' to proceed."
                  }
                },
                required: ["updates", "confirmation"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Bulk update operation results",
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
    "/bulk/delete": {
      post: {
        operationId: "bulkDeleteDocuments",
        summary: "Delete multiple documents",
        description: "Deletes multiple documents in a single request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  document_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "IDs of the documents to delete"
                  },
                  confirmation: {
                    type: "string",
                    description: "Confirmation string. Must be 'I confirm deletion of these documents' to proceed."
                  }
                },
                required: ["document_ids", "confirmation"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Bulk delete operation results",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "400": {
            description: "Missing or invalid confirmation"
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
    "/bulk/tag": {
      post: {
        operationId: "bulkTagDocuments",
        summary: "Add tags to multiple documents",
        description: "Adds specified tags to multiple documents in a single request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  document_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "IDs of the documents to tag"
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags to add to all specified documents"
                  },
                  replace_existing: {
                    type: "boolean",
                    description: "Whether to replace existing tags (true) or append to them (false)",
                    default: false
                  },
                  confirmation: {
                    type: "string",
                    description: "Confirmation string. Must be 'I confirm these tag changes' to proceed."
                  }
                },
                required: ["document_ids", "tags", "confirmation"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Bulk tagging operation results",
            content: {
              "application/json": {
                schema: {
                  type: "object"
                }
              }
            }
          },
          "400": {
            description: "Missing or invalid confirmation"
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
    "/status": {
      get: {
        operationId: "getStatus",
        summary: "Get API status and rate limit information",
        description: "Returns the current status of the API, including authentication status and rate limit information",
        parameters: [],
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
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/manifest.json": {
      get: {
        operationId: "getManifest",
        summary: "Get MCP manifest",
        description: "Returns the MCP manifest for this server",
        parameters: [],
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
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenAPISpec",
        summary: "Get OpenAPI specification",
        description: "Returns the OpenAPI specification for this server",
        parameters: [],
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
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/videos": {
      get: {
        operationId: "listVideos",
        summary: "List videos",
        description: "Retrieves a list of videos from the user's Readwise library",
        parameters: [
          {
            name: "pageCursor",
            in: "query",
            description: "Cursor for pagination (from previous response)",
            schema: {
              type: "string"
            }
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
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
    "/video/{document_id}": {
      get: {
        operationId: "getVideoDetails",
        summary: "Get video details",
        description: "Retrieves details of a specific video from the user's Readwise library",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the video",
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
          "404": {
            description: "Video not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/video/{document_id}/highlight": {
      post: {
        operationId: "createVideoHighlight",
        summary: "Create a highlight on a video",
        description: "Creates a highlight on a specific video in the user's Readwise library",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the video",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    description: "Text of the highlight"
                  },
                  timestamp: {
                    type: "string",
                    description: "Timestamp of the highlight"
                  },
                  note: {
                    type: "string",
                    description: "Optional note for the highlight"
                  }
                },
                required: ["text", "timestamp"]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Highlight created successfully",
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
          "404": {
            description: "Video not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/video/{document_id}/position": {
      post: {
        operationId: "updateVideoPosition",
        summary: "Update video playback position",
        description: "Updates the playback position of a video in the user's Readwise library",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the video",
            schema: {
              type: "string"
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  position: {
                    type: "number",
                    description: "Playback position in seconds"
                  },
                  duration: {
                    type: "number",
                    description: "Total duration of the video in seconds"
                  }
                },
                required: ["position", "duration"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Video position updated successfully",
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
          "404": {
            description: "Video not found"
          },
          "500": {
            description: "Server error"
          }
        }
      },
      get: {
        operationId: "getVideoPosition",
        summary: "Get video playback position",
        description: "Retrieves the playback position of a video in the user's Readwise library",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the video",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Video position retrieved successfully",
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
          "404": {
            description: "Video not found"
          },
          "500": {
            description: "Server error"
          }
        }
      }
    },
    "/video/{document_id}/highlights": {
      get: {
        operationId: "listVideoHighlights",
        summary: "List video highlights with timestamps",
        description: "Retrieves a list of highlights with timestamps for a specific video",
        parameters: [
          {
            name: "document_id",
            in: "path",
            required: true,
            description: "ID of the video",
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
    
    const { 
      page = 1, 
      page_size = 20, 
      category, 
      location, 
      updatedAfter, 
      pageCursor, 
      withHtmlContent 
    } = req.query as QueryParams;
    
    // Prepare query parameters
    const params: QueryParams = { page, page_size };
    if (category) params.category = category;
    if (location) params.location = location;
    if (updatedAfter) params.updatedAfter = updatedAfter;
    if (pageCursor) params.pageCursor = pageCursor;
    if (withHtmlContent) params.withHtmlContent = withHtmlContent;
    
    const response = await makeReadwiseRequest('get', '/v3/list/', token, null, params);
    
    // Add rate limit headers to the response
    if (response.headers['x-ratelimit-limit']) {
      res.setHeader('X-RateLimit-Limit', response.headers['x-ratelimit-limit']);
    }
    if (response.headers['x-ratelimit-remaining']) {
      res.setHeader('X-RateLimit-Remaining', response.headers['x-ratelimit-remaining']);
    }
    if (response.headers['x-ratelimit-reset']) {
      res.setHeader('X-RateLimit-Reset', response.headers['x-ratelimit-reset']);
    }
    
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
    
    const response = await makeReadwiseRequest('get', '/highlights/', token, null, params);
    
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
    
    const response = await makeReadwiseRequest('get', '/search/', token, { query });
    
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
    const booksResponse = await makeReadwiseRequest('get', '/books/', token, null, { page_size: limit, order_by: 'created_at' });
    
    // Then get the most recent highlights
    const highlightsResponse = await makeReadwiseRequest('get', '/highlights/', token, null, { page_size: limit, order_by: 'created_at' });
    
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

app.post('/save', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { url, title, author, html, tags, summary, notes, location, ...otherParams } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Prepare the request payload
    const payload: any = {
      url,
      saved_using: 'readwise-mcp'
    };
    
    // Add optional parameters if they exist
    if (title) payload.title = title;
    if (author) payload.author = author;
    if (html) payload.html = html;
    if (tags) payload.tags = tags;
    if (summary) payload.summary = summary;
    if (notes) payload.notes = notes;
    if (location) payload.location = location;
    
    // Send the request to Readwise API
    const response = await makeReadwiseRequest('post', '/v3/save/', token, payload);
    
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ error: 'Failed to save content to Readwise' });
  }
});

app.patch('/update/:document_id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    const { title, author, summary, published_date, image_url, location, category } = req.body;
    
    // Prepare the request payload with only the fields that are provided
    const payload: any = {};
    if (title !== undefined) payload.title = title;
    if (author !== undefined) payload.author = author;
    if (summary !== undefined) payload.summary = summary;
    if (published_date !== undefined) payload.published_date = published_date;
    if (image_url !== undefined) payload.image_url = image_url;
    if (location !== undefined) payload.location = location;
    if (category !== undefined) payload.category = category;
    
    // If no fields to update were provided
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }
    
    // Send the request to Readwise API
    const response = await makeReadwiseRequest('patch', `/v3/update/${documentId}/`, token, payload);
    
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error updating document:', error);
    
    // Check if it's a 404 error from the Readwise API
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to update document in Readwise' });
  }
});

app.delete('/delete/:document_id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    const confirm = req.query.confirm as string;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    // Check for confirmation
    if (!confirm || confirm !== 'yes') {
      return res.status(400).json({ 
        error: 'Confirmation required. Add query parameter confirm=yes to confirm deletion.',
        message: 'This is a safety measure to prevent accidental deletions.'
      });
    }
    
    // Send the delete request to Readwise API
    await axios.delete(
      `${READWISE_API_BASE}/v3/delete/${documentId}/`,
      {
        headers: {
          Authorization: `Token ${token}`
        }
      }
    );
    
    // Return success with no content
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting document:', error);
    
    // Check if it's a 404 error from the Readwise API
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete document from Readwise' });
  }
});

// Add the tag management endpoints
app.get('/tags', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Fetch all books to extract tags
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/list/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params: {
        page_size: 1000 // Get a large number to extract as many tags as possible
      }
    });
    
    // Extract unique tags from all documents
    const allTags = new Set<string>();
    response.data.results.forEach((doc: any) => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach((tag: string) => allTags.add(tag));
      }
    });
    
    res.json({
      count: allTags.size,
      tags: Array.from(allTags).sort()
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.get('/document/:document_id/tags', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    // Fetch the specific document
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/get/${documentId}/`, {
      headers: {
        Authorization: `Token ${token}`,
      }
    });
    
    // Extract tags from the document
    const tags = response.data.tags || [];
    
    res.json({
      document_id: documentId,
      tags
    });
  } catch (error: any) {
    console.error('Error fetching document tags:', error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch document tags' });
  }
});

app.put('/document/:document_id/tags', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array of strings' });
    }
    
    // Update the document with the new tags
    const response: AxiosResponse = await axios.patch(
      `${READWISE_API_BASE}/v3/update/${documentId}/`,
      { tags },
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      document_id: documentId,
      tags: response.data.tags
    });
  } catch (error: any) {
    console.error('Error updating document tags:', error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to update document tags' });
  }
});

app.post('/document/:document_id/tags/:tag', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    const tagToAdd = req.params.tag;
    
    // First get the current document to retrieve existing tags
    const getResponse: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/get/${documentId}/`, {
      headers: {
        Authorization: `Token ${token}`,
      }
    });
    
    // Get current tags and add the new one if it doesn't exist
    const currentTags = getResponse.data.tags || [];
    if (!currentTags.includes(tagToAdd)) {
      currentTags.push(tagToAdd);
    }
    
    // Update the document with the new tags
    const updateResponse: AxiosResponse = await axios.patch(
      `${READWISE_API_BASE}/v3/update/${documentId}/`,
      { tags: currentTags },
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      document_id: documentId,
      tags: updateResponse.data.tags
    });
  } catch (error: any) {
    console.error('Error adding tag to document:', error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to add tag to document' });
  }
});

app.delete('/document/:document_id/tags/:tag', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    const tagToRemove = req.params.tag;
    
    // First get the current document to retrieve existing tags
    const getResponse: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/get/${documentId}/`, {
      headers: {
        Authorization: `Token ${token}`,
      }
    });
    
    // Get current tags and remove the specified one
    const currentTags = getResponse.data.tags || [];
    const updatedTags = currentTags.filter((tag: string) => tag !== tagToRemove);
    
    // If the tag wasn't found, return an error
    if (currentTags.length === updatedTags.length) {
      return res.status(404).json({ error: 'Tag not found on document' });
    }
    
    // Update the document with the new tags
    const updateResponse: AxiosResponse = await axios.patch(
      `${READWISE_API_BASE}/v3/update/${documentId}/`,
      { tags: updatedTags },
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      document_id: documentId,
      tags: updateResponse.data.tags
    });
  } catch (error: any) {
    console.error('Error removing tag from document:', error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to remove tag from document' });
  }
});

// Add the advanced search endpoint
app.get('/search/advanced', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { 
      query, 
      category, 
      tags, 
      author, 
      title, 
      location, 
      dateFrom, 
      dateTo, 
      sortBy, 
      sortOrder,
      page = 1, 
      page_size = 20, 
      pageCursor,
      withHtmlContent
    } = req.query as QueryParams;
    
    // Prepare query parameters for the Readwise API
    const params: any = {
      page_size: page_size
    };
    
    // Add pagination
    if (page) params.page = page;
    if (pageCursor) params.page_cursor = pageCursor;
    
    // Add filters
    if (query) params.query = query;
    if (category) params.category = category;
    if (location) params.location = location;
    
    // Handle tags (convert comma-separated string to array if needed)
    if (tags) {
      if (typeof tags === 'string') {
        params.tags = tags.split(',').map(tag => tag.trim());
      } else {
        params.tags = tags;
      }
    }
    
    // Add additional filters
    if (author) params.author = author;
    if (title) params.title = title;
    
    // Handle date range
    if (dateFrom) params.updated_after = dateFrom;
    if (dateTo) params.updated_before = dateTo;
    
    // Handle sorting
    if (sortBy) {
      let sortField = sortBy;
      // Convert friendly names to API field names
      if (sortBy === 'created_at') sortField = 'created';
      if (sortBy === 'updated_at') sortField = 'updated';
      
      params.order_by = sortField;
      
      // Add sort direction if specified
      if (sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
        params.order_dir = sortOrder;
      }
    }
    
    // Include HTML content if requested
    if (withHtmlContent) {
      params.with_html_content = withHtmlContent === 'true' || withHtmlContent === true;
    }
    
    // Make the API request
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/list/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params
    });
    
    // Return the search results
    res.json(response.data);
  } catch (error) {
    console.error('Error performing advanced search:', error);
    res.status(500).json({ error: 'Failed to perform advanced search' });
  }
});

// Add reading progress endpoints
app.get('/document/:document_id/progress', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    // Fetch the document to get its metadata
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/get/${documentId}/`, {
      headers: {
        Authorization: `Token ${token}`,
      }
    });
    
    // Extract reading progress from document metadata
    // Note: This assumes Readwise API stores reading progress in the document's metadata
    // If not, we would need to implement our own storage solution
    const document = response.data;
    const metadata = document.user_metadata || {};
    
    // Extract progress information
    const progress = {
      document_id: documentId,
      title: document.title,
      status: metadata.reading_status || 'not_started',
      percentage: metadata.reading_percentage || 0,
      current_page: metadata.current_page,
      total_pages: metadata.total_pages,
      last_read_at: metadata.last_read_at
    };
    
    res.json(progress);
  } catch (error: any) {
    console.error('Error fetching reading progress:', error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch reading progress' });
  }
});

app.put('/document/:document_id/progress', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    const { status, percentage, current_page, total_pages, last_read_at } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Reading status is required' });
    }
    
    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Validate percentage if provided
    if (percentage !== undefined) {
      const percentageNum = Number(percentage);
      if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100) {
        return res.status(400).json({ error: 'Percentage must be a number between 0 and 100' });
      }
    }
    
    // First get the current document
    const getResponse: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/get/${documentId}/`, {
      headers: {
        Authorization: `Token ${token}`,
      }
    });
    
    // Prepare the metadata update
    const currentMetadata = getResponse.data.user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      reading_status: status,
      reading_percentage: percentage !== undefined ? Number(percentage) : currentMetadata.reading_percentage,
      last_read_at: last_read_at || new Date().toISOString()
    };
    
    // Add optional fields if provided
    if (current_page !== undefined) updatedMetadata.current_page = Number(current_page);
    if (total_pages !== undefined) updatedMetadata.total_pages = Number(total_pages);
    
    // Update the document with the new metadata
    const updateResponse: AxiosResponse = await axios.patch(
      `${READWISE_API_BASE}/v3/update/${documentId}/`,
      { user_metadata: updatedMetadata },
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return the updated progress information
    const updatedDocument = updateResponse.data;
    const updatedProgress = {
      document_id: documentId,
      title: updatedDocument.title,
      status: updatedMetadata.reading_status,
      percentage: updatedMetadata.reading_percentage,
      current_page: updatedMetadata.current_page,
      total_pages: updatedMetadata.total_pages,
      last_read_at: updatedMetadata.last_read_at
    };
    
    res.json(updatedProgress);
  } catch (error: any) {
    console.error('Error updating reading progress:', error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(500).json({ error: 'Failed to update reading progress' });
  }
});

app.get('/reading-list', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { status, category, page = 1, page_size = 20 } = req.query as QueryParams;
    
    // Prepare query parameters
    const params: any = {
      page,
      page_size
    };
    
    if (category) params.category = category;
    
    // Fetch documents from Readwise
    const response: AxiosResponse = await axios.get(`${READWISE_API_BASE}/v3/list/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      params
    });
    
    // Filter and transform the results to include reading progress
    const documents = response.data.results;
    let filteredDocuments = documents.map((doc: any) => {
      const metadata = doc.user_metadata || {};
      const readingStatus = metadata.reading_status || 'not_started';
      const readingPercentage = metadata.reading_percentage || 0;
      
      return {
        ...doc,
        reading_progress: {
          status: readingStatus,
          percentage: readingPercentage,
          current_page: metadata.current_page,
          total_pages: metadata.total_pages,
          last_read_at: metadata.last_read_at
        }
      };
    });
    
    // Apply status filter if provided
    if (status) {
      filteredDocuments = filteredDocuments.filter((doc: any) => 
        doc.reading_progress.status === status
      );
    }
    
    // Return the reading list
    res.json({
      count: filteredDocuments.length,
      next: response.data.next,
      previous: response.data.previous,
      results: filteredDocuments
    });
  } catch (error) {
    console.error('Error fetching reading list:', error);
    res.status(500).json({ error: 'Failed to fetch reading list' });
  }
});

// Add bulk operation endpoints
app.post('/bulk/save', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { items, confirmation } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and must not be empty' });
    }
    
    // Check for confirmation
    const requiredConfirmation = 'I confirm saving these items';
    if (!confirmation || confirmation !== requiredConfirmation) {
      return res.status(400).json({ 
        error: `Confirmation required. Add "confirmation": "${requiredConfirmation}" to your request body.`,
        message: 'This is a safety measure to prevent accidental bulk saves.'
      });
    }
    
    // Process each item in parallel
    const savePromises = items.map(async (item) => {
      try {
        if (!item.url) {
          return {
            success: false,
            error: 'URL is required',
            item
          };
        }
        
        // Prepare the request payload
        const payload: any = {
          url: item.url,
          saved_using: 'readwise-mcp'
        };
        
        // Add optional parameters if they exist
        if (item.title) payload.title = item.title;
        if (item.author) payload.author = item.author;
        if (item.html) payload.html = item.html;
        if (item.tags) payload.tags = item.tags;
        if (item.summary) payload.summary = item.summary;
        if (item.notes) payload.notes = item.notes;
        if (item.location) payload.location = item.location;
        
        // Send the request to Readwise API
        const response = await axios.post(
          `${READWISE_API_BASE}/v3/save/`,
          payload,
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return {
          success: true,
          document_id: response.data.id,
          url: item.url
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to save item',
          url: item.url
        };
      }
    });
    
    // Wait for all save operations to complete
    const results = await Promise.all(savePromises);
    
    // Count successes and failures
    const successful = results.filter(result => result.success).length;
    const failed = results.length - successful;
    
    res.json({
      total: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error in bulk save operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk save operation' });
  }
});

app.post('/bulk/update', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { updates, confirmation } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required and must not be empty' });
    }
    
    // Check for confirmation
    const requiredConfirmation = 'I confirm these updates';
    if (!confirmation || confirmation !== requiredConfirmation) {
      return res.status(400).json({ 
        error: `Confirmation required. Add "confirmation": "${requiredConfirmation}" to your request body.`,
        message: 'This is a safety measure to prevent accidental bulk updates.'
      });
    }
    
    // Process each update in parallel
    const updatePromises = updates.map(async (update) => {
      try {
        if (!update.document_id) {
          return {
            success: false,
            error: 'Document ID is required',
            update
          };
        }
        
        // Prepare the request payload with only the fields that are provided
        const payload: any = {};
        if (update.title !== undefined) payload.title = update.title;
        if (update.author !== undefined) payload.author = update.author;
        if (update.summary !== undefined) payload.summary = update.summary;
        if (update.tags !== undefined) payload.tags = update.tags;
        if (update.location !== undefined) payload.location = update.location;
        if (update.category !== undefined) payload.category = update.category;
        
        // If no fields to update were provided
        if (Object.keys(payload).length === 0) {
          return {
            success: false,
            error: 'No update fields provided',
            document_id: update.document_id
          };
        }
        
        // Send the request to Readwise API
        const response = await axios.patch(
          `${READWISE_API_BASE}/v3/update/${update.document_id}/`,
          payload,
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return {
          success: true,
          document_id: update.document_id,
          updated_fields: Object.keys(payload)
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.status === 404 ? 'Document not found' : (error.message || 'Failed to update document'),
          document_id: update.document_id
        };
      }
    });
    
    // Wait for all update operations to complete
    const results = await Promise.all(updatePromises);
    
    // Count successes and failures
    const successful = results.filter(result => result.success).length;
    const failed = results.length - successful;
    
    res.json({
      total: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error in bulk update operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk update operation' });
  }
});

app.post('/bulk/delete', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { document_ids, confirmation } = req.body;
    
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({ error: 'Document IDs array is required and must not be empty' });
    }
    
    // Check for confirmation
    const requiredConfirmation = 'I confirm deletion of these documents';
    if (!confirmation || confirmation !== requiredConfirmation) {
      return res.status(400).json({ 
        error: `Confirmation required. Add "confirmation": "${requiredConfirmation}" to your request body.`,
        message: 'This is a safety measure to prevent accidental bulk deletions.'
      });
    }
    
    // Process each deletion in parallel
    const deletePromises = document_ids.map(async (documentId) => {
      try {
        // Send the delete request to Readwise API
        await axios.delete(
          `${READWISE_API_BASE}/v3/delete/${documentId}/`,
          {
            headers: {
              Authorization: `Token ${token}`
            }
          }
        );
        
        return {
          success: true,
          document_id: documentId
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.status === 404 ? 'Document not found' : (error.message || 'Failed to delete document'),
          document_id: documentId
        };
      }
    });
    
    // Wait for all delete operations to complete
    const results = await Promise.all(deletePromises);
    
    // Count successes and failures
    const successful = results.filter(result => result.success).length;
    const failed = results.length - successful;
    
    res.json({
      total: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error in bulk delete operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk delete operation' });
  }
});

app.post('/bulk/tag', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { document_ids, tags, replace_existing = false, confirmation } = req.body;
    
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({ error: 'Document IDs array is required and must not be empty' });
    }
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags array is required and must not be empty' });
    }
    
    // Check for confirmation
    const requiredConfirmation = 'I confirm these tag changes';
    if (!confirmation || confirmation !== requiredConfirmation) {
      return res.status(400).json({ 
        error: `Confirmation required. Add "confirmation": "${requiredConfirmation}" to your request body.`,
        message: 'This is a safety measure to prevent accidental bulk tag changes.'
      });
    }
    
    // Process each document in parallel
    const tagPromises = document_ids.map(async (documentId) => {
      try {
        // If we're not replacing existing tags, we need to get the current ones first
        let updatedTags = [...tags];
        
        if (!replace_existing) {
          try {
            // Get current document to retrieve existing tags
            const getResponse = await axios.get(`${READWISE_API_BASE}/v3/get/${documentId}/`, {
              headers: {
                Authorization: `Token ${token}`,
              }
            });
            
            // Merge existing tags with new ones, avoiding duplicates
            const currentTags = getResponse.data.tags || [];
            updatedTags = [...new Set([...currentTags, ...tags])];
          } catch (error: any) {
            if (error.response?.status === 404) {
              return {
                success: false,
                error: 'Document not found',
                document_id: documentId
              };
            }
            // If there's an error getting the document, just continue with the new tags
          }
        }
        
        // Update the document with the tags
        const response = await axios.patch(
          `${READWISE_API_BASE}/v3/update/${documentId}/`,
          { tags: updatedTags },
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return {
          success: true,
          document_id: documentId,
          tags: response.data.tags
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.status === 404 ? 'Document not found' : (error.message || 'Failed to tag document'),
          document_id: documentId
        };
      }
    });
    
    // Wait for all tagging operations to complete
    const results = await Promise.all(tagPromises);
    
    // Count successes and failures
    const successful = results.filter(result => result.success).length;
    const failed = results.length - successful;
    
    res.json({
      total: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error in bulk tagging operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk tagging operation' });
  }
});

app.get('/videos', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Extract query parameters
    const queryParams: QueryParams = {};
    
    // Pagination parameters
    if (req.query.pageCursor) queryParams.pageCursor = req.query.pageCursor as string;
    if (req.query.limit) queryParams.limit = parseInt(req.query.limit as string);
    
    // Filter for videos only - we'll use the document list API and filter for YouTube URLs
    const response = await makeReadwiseRequest('get', '/v3/list/', token, null, queryParams);
    
    // Filter results to only include videos (documents with YouTube URLs or other video sources)
    const videoResults = response.data.results.filter((doc: any) => {
      // Check if the URL is from a video platform
      return (
        doc.url && (
          doc.url.includes('youtube.com') || 
          doc.url.includes('youtu.be') || 
          doc.url.includes('vimeo.com') ||
          doc.url.includes('dailymotion.com') ||
          doc.url.includes('twitch.tv')
        )
      );
    });
    
    // Return the filtered results along with pagination info
    res.json({
      count: videoResults.length,
      results: videoResults,
      nextPageCursor: response.data.nextPageCursor
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos from Readwise' });
  }
});

// Add endpoint to get video details including transcript
app.get('/video/:document_id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    // Get the document details with HTML content
    const response = await makeReadwiseRequest('get', `/v3/list/`, token, null, { 
      document_id: documentId,
      withHtmlContent: true
    });
    
    if (!response.data.results || response.data.results.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const videoDocument = response.data.results[0];
    
    // Extract transcript from HTML content if available
    let transcript = [];
    if (videoDocument.html_content) {
      // Parse the HTML to extract transcript with timestamps
      // This is a simplified approach - actual implementation would need proper HTML parsing
      const transcriptMatches = videoDocument.html_content.match(/<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      
      if (transcriptMatches && transcriptMatches[1]) {
        // Extract timestamp and text segments
        const segments = transcriptMatches[1].match(/<span[^>]*data-timestamp="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g);
        
        if (segments) {
          transcript = segments.map((segment: string) => {
            const timestampMatch = segment.match(/data-timestamp="([^"]*)"/);
            const textMatch = segment.match(/<span[^>]*>([\s\S]*?)<\/span>/);
            
            return {
              timestamp: timestampMatch ? timestampMatch[1] : null,
              text: textMatch ? textMatch[1].trim() : ''
            };
          });
        }
      }
    }
    
    // Return the video document with transcript
    res.json({
      ...videoDocument,
      transcript
    });
  } catch (error) {
    console.error('Error fetching video details:', error);
    res.status(500).json({ error: 'Failed to fetch video details from Readwise' });
  }
});

// Add endpoint to create a highlight on a video with timestamp
app.post('/video/:document_id/highlight', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    const { text, timestamp, note } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Highlight text is required' });
    }
    
    // Create the highlight with timestamp metadata
    const payload = {
      text,
      document_id: documentId,
      metadata: timestamp ? { timestamp } : undefined,
      note
    };
    
    const response = await makeReadwiseRequest('post', '/v3/highlight/', token, payload);
    
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating video highlight:', error);
    res.status(500).json({ error: 'Failed to create highlight' });
  }
});

// Add endpoint to update video playback position
app.post('/video/:document_id/position', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    const { position, duration } = req.body;
    
    if (position === undefined) {
      return res.status(400).json({ error: 'Playback position is required' });
    }
    
    // Calculate progress percentage if duration is provided
    let progressPercentage;
    if (duration && duration > 0) {
      progressPercentage = Math.min(100, Math.round((position / duration) * 100));
    }
    
    // Update document progress
    const payload: any = {
      document_id: documentId,
      progress_seconds: position
    };
    
    // Add progress percentage if calculated
    if (progressPercentage !== undefined) {
      payload.progress_percentage = progressPercentage;
    }
    
    // Use the document progress endpoint to update the position
    const response = await makeReadwiseRequest('post', `/v3/progress/`, token, payload);
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error updating video position:', error);
    res.status(500).json({ error: 'Failed to update video position' });
  }
});

// Add endpoint to get video playback position
app.get('/video/:document_id/position', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    // Get document progress
    const response = await makeReadwiseRequest('get', `/document/${documentId}/progress`, token);
    
    // Extract the relevant information
    const result = {
      document_id: documentId,
      position: response.data.progress_seconds || 0,
      percentage: response.data.progress_percentage || 0,
      last_updated: response.data.updated_at
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching video position:', error);
    res.status(500).json({ error: 'Failed to fetch video position' });
  }
});

// Add endpoint to get video highlights with timestamps
app.get('/video/:document_id/highlights', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const documentId = req.params.document_id;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    // Get all highlights for this document
    const response = await makeReadwiseRequest('get', '/v3/highlight/', token, null, { 
      document_id: documentId
    });
    
    // Filter and process highlights to extract timestamp information
    const highlights = response.data.results.map((highlight: any) => {
      // Extract timestamp from metadata if available
      const timestamp = highlight.metadata && highlight.metadata.timestamp 
        ? highlight.metadata.timestamp 
        : null;
      
      return {
        id: highlight.id,
        text: highlight.text,
        note: highlight.note,
        timestamp,
        created_at: highlight.created_at,
        updated_at: highlight.updated_at
      };
    });
    
    // Sort highlights by timestamp if available
    const sortedHighlights = highlights.sort((a: any, b: any) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return parseFloat(a.timestamp) - parseFloat(b.timestamp);
    });
    
    res.json({
      count: sortedHighlights.length,
      results: sortedHighlights
    });
  } catch (error) {
    console.error('Error fetching video highlights:', error);
    res.status(500).json({ error: 'Failed to fetch video highlights' });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  const actualPort = (server.address() as any).port;
  console.log(`Readwise MCP Server running on port ${actualPort}`);
  console.log(`MCP Manifest available at: http://localhost:${actualPort}/manifest.json`);
  console.log(`OpenAPI specification available at: http://localhost:${actualPort}/openapi.json`);
});

// Export server for testing
if (typeof module !== 'undefined') {
  module.exports = { app, server };
} 