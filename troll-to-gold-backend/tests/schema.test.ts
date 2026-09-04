/**
 * Tests: Zod validation schemas
 */

import { analyzeRequestSchema } from '../src/schemas/analysis.schema';
import { convertRequestSchema, generateRepliesRequestSchema } from '../src/schemas/conversion.schema';
import { youtubeCommentsRequestSchema } from '../src/schemas/youtube.schema';

// -----------------------------------------------------------
// analyzeRequestSchema
// -----------------------------------------------------------

describe('analyzeRequestSchema', () => {
  it('accepts a valid comment', () => {
    const result = analyzeRequestSchema.safeParse({ comment: 'Your video is garbage!' });
    expect(result.success).toBe(true);
  });

  it('accepts a comment with optional fields', () => {
    const result = analyzeRequestSchema.safeParse({
      comment: 'This is wrong',
      videoTitle: 'My Video',
      author: 'TrollUser',
      context: 'Tech review video',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing comment', () => {
    const result = analyzeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an empty comment', () => {
    const result = analyzeRequestSchema.safeParse({ comment: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only comment', () => {
    const result = analyzeRequestSchema.safeParse({ comment: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a comment exceeding max length', () => {
    const result = analyzeRequestSchema.safeParse({ comment: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from comment', () => {
    const result = analyzeRequestSchema.safeParse({ comment: '  Hello  ' });
    if (result.success) {
      expect(result.data.comment).toBe('Hello');
    }
  });
});

// -----------------------------------------------------------
// convertRequestSchema
// -----------------------------------------------------------

describe('convertRequestSchema', () => {
  it('accepts a valid comment without strategy', () => {
    const result = convertRequestSchema.safeParse({ comment: 'This video is awful' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid comment with a valid strategy', () => {
    const result = convertRequestSchema.safeParse({
      comment: 'This video is awful',
      strategy: 'comedian_comeback',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid strategy', () => {
    const result = convertRequestSchema.safeParse({
      comment: 'This video is awful',
      strategy: 'ultra_roast',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid strategies', () => {
    const validStrategies = [
      'comedian_comeback',
      'shakespearean_roast',
      'sarcastic_hr',
      'clout_booster',
      'kind_redirect',
      'ignore',
    ];
    for (const strategy of validStrategies) {
      const result = convertRequestSchema.safeParse({ comment: 'Test comment', strategy });
      expect(result.success).toBe(true);
    }
  });
});

// -----------------------------------------------------------
// generateRepliesRequestSchema
// -----------------------------------------------------------

describe('generateRepliesRequestSchema', () => {
  it('accepts a valid comment and strategy', () => {
    const result = generateRepliesRequestSchema.safeParse({
      comment: 'Garbage video',
      strategy: 'shakespearean_roast',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing strategy', () => {
    const result = generateRepliesRequestSchema.safeParse({ comment: 'Garbage video' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid strategy', () => {
    const result = generateRepliesRequestSchema.safeParse({
      comment: 'Garbage video',
      strategy: 'toxic_blast',
    });
    expect(result.success).toBe(false);
  });
});

// -----------------------------------------------------------
// youtubeCommentsRequestSchema
// -----------------------------------------------------------

describe('youtubeCommentsRequestSchema', () => {
  it('accepts a valid YouTube watch URL', () => {
    const result = youtubeCommentsRequestSchema.safeParse({
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid youtu.be URL', () => {
    const result = youtubeCommentsRequestSchema.safeParse({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-YouTube URL', () => {
    const result = youtubeCommentsRequestSchema.safeParse({
      videoUrl: 'https://vimeo.com/12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing videoUrl', () => {
    const result = youtubeCommentsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an empty string videoUrl', () => {
    const result = youtubeCommentsRequestSchema.safeParse({ videoUrl: '' });
    expect(result.success).toBe(false);
  });

  it('accepts valid sort options', () => {
    for (const sort of ['recent', 'likes', 'toxicity']) {
      const result = youtubeCommentsRequestSchema.safeParse({
        videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
        sort,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid sort option', () => {
    const result = youtubeCommentsRequestSchema.safeParse({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      sort: 'random',
    });
    expect(result.success).toBe(false);
  });
});
