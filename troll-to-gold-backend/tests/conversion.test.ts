/**
 * Tests: API endpoints using supertest
 * Mocks Featherless and YouTube services.
 * No live credentials needed.
 */

// Set env before anything imports config
process.env['NODE_ENV'] = 'test';
process.env['DEMO_MODE'] = 'true';
process.env['FEATHERLESS_API_KEY'] = 'test_key';
process.env['FEATHERLESS_MODEL'] = 'test-model';
process.env['YOUTUBE_API_KEY'] = 'test_yt_key';
process.env['PORT'] = '5001';
process.env['FRONTEND_URL'] = 'http://localhost:3000';

import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

// -----------------------------------------------------------
// Health endpoint
// -----------------------------------------------------------

describe('GET /api/health', () => {
  it('returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.aiProvider).toBe('featherless');
    expect(typeof res.body.demoMode).toBe('boolean');
  });
});

// -----------------------------------------------------------
// POST /api/analyze
// -----------------------------------------------------------

describe('POST /api/analyze', () => {
  it('returns analysis result in demo mode', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ comment: 'Your video is absolute garbage 😂' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('toxicity');
    expect(res.body.data).toHaveProperty('intent');
    expect(res.body.data).toHaveProperty('strategy');
    expect(res.body.data.toxicity).toHaveProperty('score');
    expect(res.body.data.toxicity).toHaveProperty('label');
    expect(res.body.data.toxicity).toHaveProperty('severity');
    expect(res.body.data.intent).toHaveProperty('type');
    expect(res.body.data.intent).toHaveProperty('confidence');
  });

  it('returns 400 for missing comment', async () => {
    const res = await request(app).post('/api/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty comment', async () => {
    const res = await request(app).post('/api/analyze').send({ comment: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for comment exceeding max length', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ comment: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('accepts optional context fields', async () => {
    const res = await request(app).post('/api/analyze').send({
      comment: 'This info is wrong',
      videoTitle: 'My Tech Video',
      author: 'SomeTroll',
      context: 'Technology tutorial',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// -----------------------------------------------------------
// POST /api/convert
// -----------------------------------------------------------

describe('POST /api/convert', () => {
  it('returns full conversion result in demo mode', async () => {
    const res = await request(app).post('/api/convert').send({
      comment: 'Your video is garbage 😂',
      strategy: 'comedian_comeback',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('comment');
    expect(res.body.data).toHaveProperty('toxicity');
    expect(res.body.data).toHaveProperty('intent');
    expect(res.body.data).toHaveProperty('strategy');
    expect(res.body.data).toHaveProperty('replies');
    expect(Array.isArray(res.body.data.replies)).toBe(true);
  });

  it('includes strategy.used and strategy.recommended', async () => {
    const res = await request(app).post('/api/convert').send({
      comment: 'Horrible video',
      strategy: 'sarcastic_hr',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.strategy).toHaveProperty('used');
    expect(res.body.data.strategy).toHaveProperty('recommended');
    expect(res.body.data.strategy.used).toBe('sarcastic_hr');
  });

  it('returns 400 for invalid strategy', async () => {
    const res = await request(app).post('/api/convert').send({
      comment: 'This is garbage',
      strategy: 'super_toxic_roast',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing comment', async () => {
    const res = await request(app).post('/api/convert').send({
      strategy: 'comedian_comeback',
    });
    expect(res.status).toBe(400);
  });

  it('works without a strategy (uses recommended)', async () => {
    const res = await request(app).post('/api/convert').send({
      comment: 'Nobody asked for this video.',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('reply items have required fields', async () => {
    const res = await request(app).post('/api/convert').send({
      comment: 'Your video is garbage 😂',
      strategy: 'comedian_comeback',
    });
    if (res.body.data.replies.length > 0) {
      const reply = res.body.data.replies[0];
      expect(reply).toHaveProperty('id');
      expect(reply).toHaveProperty('text');
      expect(reply).toHaveProperty('style');
      expect(reply).toHaveProperty('gold_potential');
      expect(typeof reply.gold_potential).toBe('number');
      expect(reply.gold_potential).toBeGreaterThanOrEqual(0);
      expect(reply.gold_potential).toBeLessThanOrEqual(100);
    }
  });
});

// -----------------------------------------------------------
// POST /api/generate-replies
// -----------------------------------------------------------

describe('POST /api/generate-replies', () => {
  it('returns replies in demo mode', async () => {
    const res = await request(app).post('/api/generate-replies').send({
      comment: 'Worst content ever',
      strategy: 'shakespearean_roast',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.replies)).toBe(true);
  });

  it('returns 400 for missing strategy', async () => {
    const res = await request(app).post('/api/generate-replies').send({
      comment: 'Test comment',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid strategy', async () => {
    const res = await request(app).post('/api/generate-replies').send({
      comment: 'Test comment',
      strategy: 'invalid_strategy',
    });
    expect(res.status).toBe(400);
  });
});

// -----------------------------------------------------------
// POST /api/youtube/comments
// -----------------------------------------------------------

describe('POST /api/youtube/comments', () => {
  it('returns mock YouTube comments in demo mode', async () => {
    const res = await request(app).post('/api/youtube/comments').send({
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('video');
    expect(res.body.data).toHaveProperty('comments');
    expect(Array.isArray(res.body.data.comments)).toBe(true);
    expect(res.body.data.video).toHaveProperty('videoId');
    expect(res.body.data.video).toHaveProperty('title');
  });

  it('returns 400 for invalid YouTube URL', async () => {
    const res = await request(app).post('/api/youtube/comments').send({
      videoUrl: 'https://vimeo.com/12345',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for missing videoUrl', async () => {
    const res = await request(app).post('/api/youtube/comments').send({});
    expect(res.status).toBe(400);
  });

  it('comment items have expected fields', async () => {
    const res = await request(app).post('/api/youtube/comments').send({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    });
    if (res.body.data.comments.length > 0) {
      const comment = res.body.data.comments[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('text');
      expect(comment).toHaveProperty('likeCount');
      expect(comment).toHaveProperty('publishedAt');
    }
  });
});

// -----------------------------------------------------------
// 404 handler
// -----------------------------------------------------------

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// -----------------------------------------------------------
// History endpoint
// -----------------------------------------------------------

describe('GET /api/history', () => {
  it('returns history entries', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.entries)).toBe(true);
  });
});
