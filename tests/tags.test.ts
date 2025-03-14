import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mock tags data
const mockTags = ['research', 'ai', 'programming', 'important'];
const mockDocumentTags = ['ai', 'important'];

// Mock tag endpoints
app.get('/tags', (req, res) => {
  res.status(200).json({
    tags: mockTags
  });
});

app.get('/document/:document_id/tags', (req, res) => {
  res.status(200).json({
    document_id: req.params.document_id,
    tags: mockDocumentTags
  });
});

app.put('/document/:document_id/tags', (req, res) => {
  const { tags } = req.body;
  if (!tags || !Array.isArray(tags)) {
    return res.status(400).json({ error: 'Invalid tags format' });
  }
  
  res.status(200).json({
    document_id: req.params.document_id,
    tags: tags
  });
});

app.post('/document/:document_id/tags/:tag', (req, res) => {
  const { document_id, tag } = req.params;
  
  res.status(200).json({
    document_id,
    tags: [...mockDocumentTags, tag]
  });
});

app.delete('/document/:document_id/tags/:tag', (req, res) => {
  const { document_id, tag } = req.params;
  
  const updatedTags = mockDocumentTags.filter(t => t !== tag);
  
  res.status(200).json({
    document_id,
    tags: updatedTags
  });
});

describe('Tag Management Endpoints', () => {
  it('should list all tags', async () => {
    const response = await request(app).get('/tags');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tags');
    expect(Array.isArray(response.body.tags)).toBe(true);
    expect(response.body.tags).toEqual(mockTags);
  });
  
  it('should get tags for a document', async () => {
    const documentId = '12345';
    const response = await request(app).get(`/document/${documentId}/tags`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('document_id', documentId);
    expect(response.body).toHaveProperty('tags');
    expect(Array.isArray(response.body.tags)).toBe(true);
    expect(response.body.tags).toEqual(mockDocumentTags);
  });
  
  it('should update all tags for a document', async () => {
    const documentId = '12345';
    const newTags = ['research', 'machine-learning'];
    
    const response = await request(app)
      .put(`/document/${documentId}/tags`)
      .send({ tags: newTags });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('document_id', documentId);
    expect(response.body).toHaveProperty('tags');
    expect(response.body.tags).toEqual(newTags);
  });
  
  it('should add a tag to a document', async () => {
    const documentId = '12345';
    const newTag = 'new-tag';
    
    const response = await request(app)
      .post(`/document/${documentId}/tags/${newTag}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('document_id', documentId);
    expect(response.body).toHaveProperty('tags');
    expect(response.body.tags).toContain(newTag);
    expect(response.body.tags).toContain('ai');
    expect(response.body.tags).toContain('important');
  });
  
  it('should remove a tag from a document', async () => {
    const documentId = '12345';
    const tagToRemove = 'ai';
    
    const response = await request(app)
      .delete(`/document/${documentId}/tags/${tagToRemove}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('document_id', documentId);
    expect(response.body).toHaveProperty('tags');
    expect(response.body.tags).not.toContain(tagToRemove);
    expect(response.body.tags).toContain('important');
  });
}); 