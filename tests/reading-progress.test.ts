import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mock document progress data
const mockProgress = {
  status: 'in_progress',
  percentage: 45,
  current_page: 112,
  total_pages: 250,
  last_read_at: new Date().toISOString()
};

// Mock reading progress endpoints
app.get('/document/:document_id/progress', (req, res) => {
  res.status(200).json({
    document_id: req.params.document_id,
    ...mockProgress
  });
});

app.put('/document/:document_id/progress', (req, res) => {
  const { status, percentage, current_page, total_pages } = req.body;
  
  // Validate required fields
  if (!status || !['not_started', 'in_progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: not_started, in_progress, completed' });
  }
  
  if (percentage !== undefined && (typeof percentage !== 'number' || percentage < 0 || percentage > 100)) {
    return res.status(400).json({ error: 'Percentage must be a number between 0 and 100' });
  }
  
  const updatedProgress = {
    status,
    percentage: percentage !== undefined ? percentage : mockProgress.percentage,
    current_page: current_page !== undefined ? current_page : mockProgress.current_page,
    total_pages: total_pages !== undefined ? total_pages : mockProgress.total_pages,
    last_read_at: new Date().toISOString()
  };
  
  res.status(200).json({
    document_id: req.params.document_id,
    ...updatedProgress
  });
});

// Mock reading list endpoint
app.get('/reading-list', (req, res) => {
  const { status, page = '1', page_size = '10' } = req.query;
  
  // Create mock documents with different reading statuses
  const mockDocuments = [
    {
      id: 'doc-1',
      title: 'Book 1',
      author: 'Author 1',
      category: 'book',
      reading_progress: {
        status: 'not_started',
        percentage: 0
      }
    },
    {
      id: 'doc-2',
      title: 'Article 1',
      author: 'Author 2',
      category: 'article',
      reading_progress: {
        status: 'in_progress',
        percentage: 45
      }
    },
    {
      id: 'doc-3',
      title: 'Book 2',
      author: 'Author 3',
      category: 'book',
      reading_progress: {
        status: 'completed',
        percentage: 100
      }
    }
  ];
  
  // Filter by status if provided
  let filteredDocuments = mockDocuments;
  if (status) {
    filteredDocuments = mockDocuments.filter(doc => doc.reading_progress.status === status);
  }
  
  const pageNum = parseInt(page as string, 10);
  const pageSizeNum = parseInt(page_size as string, 10);
  const startIndex = (pageNum - 1) * pageSizeNum;
  const endIndex = startIndex + pageSizeNum;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);
  
  res.status(200).json({
    count: filteredDocuments.length,
    next: pageNum * pageSizeNum < filteredDocuments.length ? 
      `/reading-list?page=${pageNum + 1}&page_size=${pageSizeNum}${status ? `&status=${status}` : ''}` : 
      null,
    previous: pageNum > 1 ? 
      `/reading-list?page=${pageNum - 1}&page_size=${pageSizeNum}${status ? `&status=${status}` : ''}` : 
      null,
    results: paginatedDocuments
  });
});

describe('Reading Progress Tracking', () => {
  describe('Document Progress', () => {
    it('should get reading progress for a document', async () => {
      const documentId = '12345';
      const response = await request(app).get(`/document/${documentId}/progress`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('document_id', documentId);
      expect(response.body).toHaveProperty('status', mockProgress.status);
      expect(response.body).toHaveProperty('percentage', mockProgress.percentage);
      expect(response.body).toHaveProperty('current_page', mockProgress.current_page);
      expect(response.body).toHaveProperty('total_pages', mockProgress.total_pages);
      expect(response.body).toHaveProperty('last_read_at');
    });
    
    it('should update reading progress for a document', async () => {
      const documentId = '12345';
      const updatedProgress = {
        status: 'completed',
        percentage: 100,
        current_page: 250,
        total_pages: 250
      };
      
      const response = await request(app)
        .put(`/document/${documentId}/progress`)
        .send(updatedProgress);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('document_id', documentId);
      expect(response.body).toHaveProperty('status', updatedProgress.status);
      expect(response.body).toHaveProperty('percentage', updatedProgress.percentage);
      expect(response.body).toHaveProperty('current_page', updatedProgress.current_page);
      expect(response.body).toHaveProperty('total_pages', updatedProgress.total_pages);
      expect(response.body).toHaveProperty('last_read_at');
    });
    
    it('should validate status when updating progress', async () => {
      const documentId = '12345';
      const invalidProgress = {
        status: 'invalid_status',
        percentage: 50
      };
      
      const response = await request(app)
        .put(`/document/${documentId}/progress`)
        .send(invalidProgress);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status');
    });
    
    it('should validate percentage when updating progress', async () => {
      const documentId = '12345';
      const invalidProgress = {
        status: 'in_progress',
        percentage: 150 // Invalid: > 100
      };
      
      const response = await request(app)
        .put(`/document/${documentId}/progress`)
        .send(invalidProgress);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Percentage must be');
    });
  });
  
  describe('Reading List', () => {
    it('should get all reading list items', async () => {
      const response = await request(app).get('/reading-list');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(3);
      expect(response.body.results[0]).toHaveProperty('reading_progress');
      expect(response.body.results[1]).toHaveProperty('reading_progress');
      expect(response.body.results[2]).toHaveProperty('reading_progress');
    });
    
    it('should filter reading list by status', async () => {
      const response = await request(app).get('/reading-list?status=in_progress');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count', 1);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toHaveProperty('reading_progress');
      expect(response.body.results[0].reading_progress).toHaveProperty('status', 'in_progress');
    });
    
    it('should paginate reading list results', async () => {
      const response = await request(app).get('/reading-list?page=1&page_size=2');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('next');
      expect(response.body.next).toContain('page=2');
      expect(response.body).toHaveProperty('previous', null);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
    });
  });
}); 