/**
 * YouTube URL parsing and validation utilities.
 */

const YOUTUBE_HOSTNAME_PATTERN = /^(www\.|m\.)?youtube\.com$/;
const YOUTUBE_SHORT_HOSTNAME = 'youtu.be';
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract the YouTube video ID from a variety of URL formats:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    const hostname = url.hostname;

    // youtu.be/<id>
    if (hostname === YOUTUBE_SHORT_HOSTNAME) {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return isValidVideoId(id) ? id : null;
    }

    // youtube.com variants
    if (YOUTUBE_HOSTNAME_PATTERN.test(hostname)) {
      // /watch?v=
      const vParam = url.searchParams.get('v');
      if (vParam && isValidVideoId(vParam)) {
        return vParam;
      }

      // /shorts/<id> or /embed/<id> or /v/<id>
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const prefixes = ['shorts', 'embed', 'v', 'e'];
      for (let i = 0; i < pathSegments.length - 1; i++) {
        if (prefixes.includes(pathSegments[i])) {
          const id = pathSegments[i + 1];
          if (id && isValidVideoId(id)) return id;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check that a string looks like a YouTube video ID (11 alphanumeric chars).
 */
export function isValidVideoId(id: string): boolean {
  return VIDEO_ID_REGEX.test(id);
}

/**
 * Check that a URL is a recognizable YouTube video URL.
 */
export function isValidYouTubeUrl(rawUrl: string): boolean {
  return extractVideoId(rawUrl) !== null;
}
