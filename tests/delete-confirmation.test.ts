import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mock delete endpoint with confirmation
app.delete('/delete/:document_id', (req, res) => {
  const { document_id } = req.params;
  const { confirm } = req.query;
  
  if (!confirm || confirm !== 'yes') {
    return res.status(400).json({ 
      error: 'Missing confirmation. Please add ?confirm=yes to confirm deletion.' 
    });
  }
  
  res.status(200).json({
    success: true,
    document_id,
    message: 'Document deleted successfully'
  });
});

describe('Delete Confirmation', () => {
  it('should require confirmation for document deletion', async () => {
    const documentId = '12345';
    const response = await request(app).delete(`/delete/${documentId}`);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Missing confirmation');
  });
  
  it('should reject deletion with invalid confirmation', async () => {
    const documentId = '12345';
    const response = await request(app).delete(`/delete/${documentId}?confirm=maybe`);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Missing confirmation');
  });
  
  it('should process deletion with valid confirmation', async () => {
    const documentId = '12345';
    const response = await request(app).delete(`/delete/${documentId}?confirm=yes`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('document_id', documentId);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('deleted successfully');
  });
}); 