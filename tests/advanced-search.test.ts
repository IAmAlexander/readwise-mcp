import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Define document type
interface Document {
  id: string;
  title: string;
  author: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  location: string;
  html_content?: string;
  [key: string]: any; // Index signature to allow dynamic property access
}

// Mock search results
const mockSearchResults: Document[] = [
  {
    id: 'doc-1',
    title: 'Machine Learning Basics',
    author: 'John Smith',
    category: 'article',
    tags: ['ai', 'machine-learning', 'tutorial'],
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-16T14:20:00Z',
    location: 'new'
  },
  {
    id: 'doc-2',
    title: 'Advanced AI Techniques',
    author: 'Jane Doe',
    category: 'article',
    tags: ['ai', 'research', 'advanced'],
    created_at: '2023-02-20T09:15:00Z',
    updated_at: '2023-02-21T11:45:00Z',
    location: 'later'
  },
  {
    id: 'doc-3',
    title: 'The Future of Machine Learning',
    author: 'John Smith',
    category: 'book',
    tags: ['ai', 'machine-learning', 'future'],
    created_at: '2023-03-10T16:20:00Z',
    updated_at: '2023-03-12T08:30:00Z',
    location: 'archive'
  }
];

// Mock advanced search endpoint
app.get('/search/advanced', (req, res) => {
  const {
    query,
    category,
    tags,
    author,
    title,
    location,
    dateFrom,
    dateTo,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = '1',
    page_size = '10',
    withHtmlContent = 'false'
  } = req.query;
  
  // Filter results based on query parameters
  let filteredResults = [...mockSearchResults];
  
  if (query) {
    const searchQuery = (query as string).toLowerCase();
    filteredResults = filteredResults.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery) || 
      doc.author.toLowerCase().includes(searchQuery)
    );
  }
  
  if (category) {
    filteredResults = filteredResults.filter(doc => doc.category === category);
  }
  
  if (tags) {
    const tagList = (tags as string).split(',');
    filteredResults = filteredResults.filter(doc => 
      tagList.every(tag => doc.tags.includes(tag))
    );
  }
  
  if (author) {
    const authorQuery = (author as string).toLowerCase();
    filteredResults = filteredResults.filter(doc => 
      doc.author.toLowerCase().includes(authorQuery)
    );
  }
  
  if (title) {
    const titleQuery = (title as string).toLowerCase();
    filteredResults = filteredResults.filter(doc => 
      doc.title.toLowerCase().includes(titleQuery)
    );
  }
  
  if (location) {
    filteredResults = filteredResults.filter(doc => doc.location === location);
  }
  
  if (dateFrom) {
    const fromDate = new Date(dateFrom as string);
    filteredResults = filteredResults.filter(doc => 
      new Date(doc.created_at) >= fromDate
    );
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo as string);
    filteredResults = filteredResults.filter(doc => 
      new Date(doc.created_at) <= toDate
    );
  }
  
  // Sort results
  const sortField = sortBy as keyof Document;
  const order = (sortOrder as string).toLowerCase() === 'asc' ? 1 : -1;
  
  filteredResults.sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return -1 * order;
    if (aValue > bValue) return 1 * order;
    return 0;
  });
  
  // Pagination
  const pageNum = parseInt(page as string, 10);
  const pageSizeNum = parseInt(page_size as string, 10);
  const startIndex = (pageNum - 1) * pageSizeNum;
  const endIndex = startIndex + pageSizeNum;
  const paginatedResults = filteredResults.slice(startIndex, endIndex);
  
  // Add HTML content if requested
  const results = paginatedResults.map(doc => {
    const result: Document = { ...doc };
    if (withHtmlContent === 'true') {
      result.html_content = `<article><h1>${doc.title}</h1><p>Author: ${doc.author}</p><p>Sample content for ${doc.title}</p></article>`;
    }
    return result;
  });
  
  res.status(200).json({
    count: filteredResults.length,
    next: pageNum * pageSizeNum < filteredResults.length ? 
      `/search/advanced?page=${pageNum + 1}&page_size=${pageSizeNum}` : 
      null,
    previous: pageNum > 1 ? 
      `/search/advanced?page=${pageNum - 1}&page_size=${pageSizeNum}` : 
      null,
    results
  });
});

describe('Advanced Search', () => {
  it('should return all results when no filters are applied', async () => {
    const response = await request(app).get('/search/advanced');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 3);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(3);
  });
  
  it('should filter by search query', async () => {
    const response = await request(app).get('/search/advanced?query=machine');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 2);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results[0].title).toContain('Machine');
    expect(response.body.results[1].title).toContain('Machine');
  });
  
  it('should filter by category', async () => {
    const response = await request(app).get('/search/advanced?category=book');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 1);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].category).toBe('book');
  });
  
  it('should filter by tags', async () => {
    const response = await request(app).get('/search/advanced?tags=ai,research');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 1);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].tags).toContain('ai');
    expect(response.body.results[0].tags).toContain('research');
  });
  
  it('should filter by author', async () => {
    const response = await request(app).get('/search/advanced?author=John');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 2);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results[0].author).toContain('John');
    expect(response.body.results[1].author).toContain('John');
  });
  
  it('should filter by title', async () => {
    const response = await request(app).get('/search/advanced?title=Advanced');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 1);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].title).toContain('Advanced');
  });
  
  it('should filter by location', async () => {
    const response = await request(app).get('/search/advanced?location=later');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 1);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].location).toBe('later');
  });
  
  it('should filter by date range', async () => {
    const response = await request(app).get('/search/advanced?dateFrom=2023-02-01&dateTo=2023-03-01');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 1);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].id).toBe('doc-2');
  });
  
  it('should sort results', async () => {
    const response = await request(app).get('/search/advanced?sortBy=title&sortOrder=asc');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(3);
    expect(response.body.results[0].title).toBe('Advanced AI Techniques');
    expect(response.body.results[1].title).toBe('Machine Learning Basics');
    expect(response.body.results[2].title).toBe('The Future of Machine Learning');
  });
  
  it('should include HTML content when requested', async () => {
    const response = await request(app).get('/search/advanced?withHtmlContent=true');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results[0]).toHaveProperty('html_content');
    expect(response.body.results[1]).toHaveProperty('html_content');
    expect(response.body.results[2]).toHaveProperty('html_content');
  });
  
  it('should paginate results', async () => {
    const response = await request(app).get('/search/advanced?page=1&page_size=2');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count', 3);
    expect(response.body).toHaveProperty('next');
    expect(response.body.next).toContain('page=2');
    expect(response.body).toHaveProperty('previous', null);
    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toHaveLength(2);
  });
}); 