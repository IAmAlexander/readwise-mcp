import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mock status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    rate_limit: {
      limit: 100,
      remaining: 95,
      reset: new Date(Date.now() + 3600000).toISOString()
    }
  });
});

describe('Status Endpoint', () => {
  it('should return status information', async () => {
    const response = await request(app).get('/status');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('rate_limit');
    expect(response.body.rate_limit).toHaveProperty('limit');
    expect(response.body.rate_limit).toHaveProperty('remaining');
    expect(response.body.rate_limit).toHaveProperty('reset');
  });
}); 