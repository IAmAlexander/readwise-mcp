import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mock videos endpoint
app.get('/videos', (req, res) => {
  const pageCursor = req.query.pageCursor;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const mockVideos = [
    {
      id: 'video1',
      title: 'Introduction to TypeScript',
      url: 'https://www.youtube.com/watch?v=abc123',
      created_at: '2023-01-15T12:00:00Z',
      updated_at: '2023-01-15T12:00:00Z',
      author: 'Tech Channel',
      tags: ['programming', 'typescript']
    },
    {
      id: 'video2',
      title: 'AI Safety Explained',
      url: 'https://www.youtube.com/watch?v=def456',
      created_at: '2023-02-20T14:30:00Z',
      updated_at: '2023-02-20T14:30:00Z',
      author: 'AI Research',
      tags: ['ai', 'safety']
    },
    {
      id: 'video3',
      title: 'Web Development in 2023',
      url: 'https://youtu.be/ghi789',
      created_at: '2023-03-10T09:15:00Z',
      updated_at: '2023-03-10T09:15:00Z',
      author: 'Dev Channel',
      tags: ['web', 'development']
    }
  ];
  
  const nextPageCursor = pageCursor ? null : 'next_page_token';
  
  res.status(200).json({
    count: mockVideos.length,
    results: mockVideos.slice(0, limit),
    nextPageCursor
  });
});

// Mock video details endpoint
app.get('/video/:document_id', (req, res) => {
  const documentId = req.params.document_id;
  
  if (documentId !== 'video1' && documentId !== 'video2' && documentId !== 'video3') {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const mockTranscript = [
    { timestamp: '0:00', text: 'Hello and welcome to this video.' },
    { timestamp: '0:15', text: 'Today we\'ll be discussing an important topic.' },
    { timestamp: '0:30', text: 'Let\'s dive right in.' },
    { timestamp: '1:45', text: 'This is a key point to remember.' },
    { timestamp: '2:30', text: 'Now let\'s look at some examples.' },
    { timestamp: '5:15', text: 'To summarize what we\'ve learned.' },
    { timestamp: '6:00', text: 'Thanks for watching!' }
  ];
  
  const videoDetails = {
    id: documentId,
    title: documentId === 'video1' ? 'Introduction to TypeScript' : 
           documentId === 'video2' ? 'AI Safety Explained' : 'Web Development in 2023',
    url: documentId === 'video1' ? 'https://www.youtube.com/watch?v=abc123' :
         documentId === 'video2' ? 'https://www.youtube.com/watch?v=def456' : 'https://youtu.be/ghi789',
    created_at: '2023-01-15T12:00:00Z',
    updated_at: '2023-01-15T12:00:00Z',
    author: documentId === 'video1' ? 'Tech Channel' : 
            documentId === 'video2' ? 'AI Research' : 'Dev Channel',
    tags: documentId === 'video1' ? ['programming', 'typescript'] :
          documentId === 'video2' ? ['ai', 'safety'] : ['web', 'development'],
    transcript: mockTranscript
  };
  
  res.status(200).json(videoDetails);
});

// Mock video highlights endpoint
app.get('/video/:document_id/highlights', (req, res) => {
  const documentId = req.params.document_id;
  
  if (documentId !== 'video1' && documentId !== 'video2' && documentId !== 'video3') {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const mockHighlights = [
    {
      id: 'highlight1',
      text: 'This is a key point to remember.',
      note: 'Important concept',
      timestamp: '1:45',
      created_at: '2023-01-16T10:30:00Z',
      updated_at: '2023-01-16T10:30:00Z'
    },
    {
      id: 'highlight2',
      text: 'To summarize what we\'ve learned.',
      note: null,
      timestamp: '5:15',
      created_at: '2023-01-16T10:35:00Z',
      updated_at: '2023-01-16T10:35:00Z'
    }
  ];
  
  res.status(200).json({
    count: mockHighlights.length,
    results: mockHighlights
  });
});

// Mock create video highlight endpoint
app.post('/video/:document_id/highlight', (req, res) => {
  const documentId = req.params.document_id;
  
  if (documentId !== 'video1' && documentId !== 'video2' && documentId !== 'video3') {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const { text, timestamp, note } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Highlight text is required' });
  }
  
  const newHighlight = {
    id: 'new_highlight_id',
    text,
    timestamp,
    note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  res.status(201).json(newHighlight);
});

// Mock video position endpoints
app.get('/video/:document_id/position', (req, res) => {
  const documentId = req.params.document_id;
  
  if (documentId !== 'video1' && documentId !== 'video2' && documentId !== 'video3') {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const mockPosition = {
    document_id: documentId,
    position: 125.5,
    percentage: 35,
    last_updated: new Date().toISOString()
  };
  
  res.status(200).json(mockPosition);
});

app.post('/video/:document_id/position', (req, res) => {
  const documentId = req.params.document_id;
  
  if (documentId !== 'video1' && documentId !== 'video2' && documentId !== 'video3') {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const { position, duration } = req.body;
  
  if (position === undefined) {
    return res.status(400).json({ error: 'Playback position is required' });
  }
  
  const progressPercentage = duration ? Math.min(100, Math.round((position / duration) * 100)) : null;
  
  const updatedPosition = {
    document_id: documentId,
    position,
    percentage: progressPercentage || 0,
    last_updated: new Date().toISOString()
  };
  
  res.status(200).json(updatedPosition);
});

describe('Video Features', () => {
  describe('List Videos', () => {
    it('should return a list of videos', async () => {
      const response = await request(app).get('/videos');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('nextPageCursor');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      
      const video = response.body.results[0];
      expect(video).toHaveProperty('id');
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('url');
      expect(video.url).toMatch(/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv/);
    });
    
    it('should respect the limit parameter', async () => {
      const limit = 2;
      const response = await request(app).get(`/videos?limit=${limit}`);
      
      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeLessThanOrEqual(limit);
    });
  });
  
  describe('Get Video Details', () => {
    it('should return video details with transcript', async () => {
      const response = await request(app).get('/video/video1');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'video1');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('transcript');
      expect(Array.isArray(response.body.transcript)).toBe(true);
      
      const transcriptItem = response.body.transcript[0];
      expect(transcriptItem).toHaveProperty('timestamp');
      expect(transcriptItem).toHaveProperty('text');
    });
    
    it('should return 404 for non-existent video', async () => {
      const response = await request(app).get('/video/nonexistent');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('Video Highlights', () => {
    it('should return highlights for a video', async () => {
      const response = await request(app).get('/video/video1/highlights');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      
      const highlight = response.body.results[0];
      expect(highlight).toHaveProperty('id');
      expect(highlight).toHaveProperty('text');
      expect(highlight).toHaveProperty('timestamp');
    });
    
    it('should create a new highlight with timestamp', async () => {
      const highlightData = {
        text: 'This is a test highlight',
        timestamp: '2:30',
        note: 'Test note'
      };
      
      const response = await request(app)
        .post('/video/video1/highlight')
        .send(highlightData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('text', highlightData.text);
      expect(response.body).toHaveProperty('timestamp', highlightData.timestamp);
      expect(response.body).toHaveProperty('note', highlightData.note);
    });
    
    it('should require highlight text', async () => {
      const highlightData = {
        timestamp: '2:30'
      };
      
      const response = await request(app)
        .post('/video/video1/highlight')
        .send(highlightData);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Video Playback Position', () => {
    it('should return the current playback position', async () => {
      const response = await request(app).get('/video/video1/position');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('document_id', 'video1');
      expect(response.body).toHaveProperty('position');
      expect(response.body).toHaveProperty('percentage');
      expect(response.body).toHaveProperty('last_updated');
    });
    
    it('should update the playback position', async () => {
      const positionData = {
        position: 180.5,
        duration: 360
      };
      
      const response = await request(app)
        .post('/video/video1/position')
        .send(positionData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('document_id', 'video1');
      expect(response.body).toHaveProperty('position', positionData.position);
      expect(response.body).toHaveProperty('percentage', 50); // 180.5/360 = 50%
    });
    
    it('should require position parameter', async () => {
      const positionData = {
        duration: 360
      };
      
      const response = await request(app)
        .post('/video/video1/position')
        .send(positionData);
      
      expect(response.status).toBe(400);
    });
  });
}); 