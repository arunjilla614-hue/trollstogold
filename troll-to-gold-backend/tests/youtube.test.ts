/**
 * Tests: YouTube URL utilities
 */

import { extractVideoId, isValidVideoId, isValidYouTubeUrl } from '../src/utils/youtube.utils';

describe('YouTube Utilities', () => {
  // -----------------------------------------------------------
  // isValidVideoId
  // -----------------------------------------------------------

  describe('isValidVideoId', () => {
    it('accepts a valid 11-character video ID', () => {
      expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
    });

    it('rejects an ID that is too short', () => {
      expect(isValidVideoId('abc')).toBe(false);
    });

    it('rejects an ID that is too long', () => {
      expect(isValidVideoId('dQw4w9WgXcQXXXX')).toBe(false);
    });

    it('rejects an ID with invalid characters', () => {
      expect(isValidVideoId('dQw4w9Wg!cQ')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isValidVideoId('')).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // extractVideoId
  // -----------------------------------------------------------

  describe('extractVideoId', () => {
    it('extracts from standard watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts from youtu.be short URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts from youtube.com/shorts URL', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts from mobile URL', () => {
      expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts from URL without www', () => {
      expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for a non-YouTube URL', () => {
      expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
    });

    it('returns null for a random string', () => {
      expect(extractVideoId('not-a-url')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractVideoId('')).toBeNull();
    });

    it('returns null for YouTube URL without video ID', () => {
      expect(extractVideoId('https://www.youtube.com/')).toBeNull();
    });

    it('returns null for YouTube URL with invalid video ID', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // isValidYouTubeUrl
  // -----------------------------------------------------------

  describe('isValidYouTubeUrl', () => {
    it('returns true for a valid watch URL', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('returns true for a valid youtu.be URL', () => {
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('returns false for a non-YouTube URL', () => {
      expect(isValidYouTubeUrl('https://www.google.com')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isValidYouTubeUrl('')).toBe(false);
    });
  });
});
