import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { YouTubeComment, YouTubeCommentsResult, YouTubeVideo } from '../types';
import { extractVideoId } from '../utils/youtube.utils';
import { createLogger } from '../utils/logger';
import { DEMO_YOUTUBE_COMMENTS } from './demo.data';
import { isDemoMode } from '../config/env';

const logger = createLogger('youtube-service');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_MAX_RESULTS = 50;

// -----------------------------------------------------------
// Error classes
// -----------------------------------------------------------

export class YouTubeInvalidUrlError extends Error {
  constructor(message = 'Invalid YouTube URL') {
    super(message);
    this.name = 'YouTubeInvalidUrlError';
  }
}

export class YouTubeVideoNotFoundError extends Error {
  constructor(message = 'YouTube video not found') {
    super(message);
    this.name = 'YouTubeVideoNotFoundError';
  }
}

export class YouTubeCommentsDisabledError extends Error {
  constructor(message = 'Comments are disabled for this video') {
    super(message);
    this.name = 'YouTubeCommentsDisabledError';
  }
}

export class YouTubePrivateVideoError extends Error {
  constructor(message = 'This video is private or unavailable') {
    super(message);
    this.name = 'YouTubePrivateVideoError';
  }
}

export class YouTubeQuotaExceededError extends Error {
  constructor(message = 'YouTube API quota exceeded') {
    super(message);
    this.name = 'YouTubeQuotaExceededError';
  }
}

export class YouTubeApiError extends Error {
  statusCode?: number;
  constructor(message = 'YouTube API error', statusCode?: number) {
    super(message);
    this.name = 'YouTubeApiError';
    this.statusCode = statusCode;
  }
}

// -----------------------------------------------------------
// Internal YouTube API response types
// -----------------------------------------------------------

interface YouTubeVideoListResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
    };
    status?: {
      privacyStatus?: string;
    };
  }>;
  pageInfo?: {
    totalResults?: number;
  };
}

interface YouTubeCommentThreadsResponse {
  items?: Array<{
    id: string;
    snippet?: {
      topLevelComment?: {
        id?: string;
        snippet?: {
          authorDisplayName?: string;
          textDisplay?: string;
          textOriginal?: string;
          likeCount?: number;
          publishedAt?: string;
        };
      };
    };
  }>;
  nextPageToken?: string;
  pageInfo?: {
    totalResults?: number;
  };
}

// -----------------------------------------------------------
// Main YouTube service functions
// -----------------------------------------------------------

/**
 * Fetch video metadata and comments from a YouTube video URL.
 * Returns a single page of comments (up to maxResults).
 * Use fetchAllYouTubeComments() to retrieve ALL available comments.
 */
export async function fetchYouTubeComments(params: {
  videoUrl: string;
  maxResults?: number;
  pageToken?: string;
  sort?: 'recent' | 'likes' | 'toxicity';
}): Promise<YouTubeCommentsResult> {
  if (isDemoMode) {
    logger.info('Demo mode: returning mock YouTube comments');
    return DEMO_YOUTUBE_COMMENTS;
  }

  const { videoUrl, maxResults = DEFAULT_MAX_RESULTS, pageToken, sort = 'recent' } = params;

  // Extract video ID
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new YouTubeInvalidUrlError(
      'Could not extract a valid video ID from the provided URL'
    );
  }

  logger.info({ videoId, maxResults, sort }, 'Fetching YouTube comments (single page)');

  // Fetch video metadata
  const video = await fetchVideoMetadata(videoId);

  // Fetch comments
  const { comments, nextPageToken, totalResults } = await fetchCommentThreads({
    videoId,
    maxResults,
    pageToken,
    sort,
  });

  return {
    video,
    comments,
    nextPageToken,
    totalResults,
  };
}

// Maximum pages to fetch to avoid runaway pagination on massive channels
const MAX_PAGES = 200; // 200 pages × 100 results = up to 20,000 comments

/**
 * Fetch ALL available comments for a YouTube video.
 * Loops through every page using nextPageToken until exhausted.
 * Deduplicates comments by ID.
 * No artificial total limit is applied.
 */
export async function fetchAllYouTubeComments(params: {
  videoUrl: string;
  sort?: 'recent' | 'likes' | 'toxicity';
  maxComments?: number;
}): Promise<YouTubeCommentsResult> {
  if (isDemoMode) {
    logger.info('Demo mode: returning mock YouTube comments (all)');
    return DEMO_YOUTUBE_COMMENTS;
  }

  const { videoUrl, sort = 'recent', maxComments } = params;

  // Extract video ID
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new YouTubeInvalidUrlError(
      'Could not extract a valid video ID from the provided URL'
    );
  }

  logger.info({ videoId, sort }, 'Fetching ALL YouTube comments (paginated)');

  // Fetch video metadata once
  const video = await fetchVideoMetadata(videoId);

  // Paginate through all comment pages
  const allComments: YouTubeComment[] = [];
  const seenIds = new Set<string>();
  let nextToken: string | undefined = undefined;
  let totalResults: number | undefined = undefined;
  let pageCount = 0;

  do {
    pageCount++;
    logger.info(
      { videoId, page: pageCount, fetched: allComments.length },
      'Fetching comments page'
    );

    const result = await fetchCommentThreads({
      videoId,
      maxResults: 100, // Maximum allowed per YouTube API request
      pageToken: nextToken,
      sort,
    });

    // Capture totalResults from first page
    if (totalResults === undefined) {
      totalResults = result.totalResults;
    }

    // Deduplicate and append
    for (const comment of result.comments) {
      if (!seenIds.has(comment.id)) {
        seenIds.add(comment.id);
        allComments.push(comment);
      }
    }

    nextToken = result.nextPageToken;

    if (pageCount >= MAX_PAGES) {
      logger.warn(
        { videoId, pages: pageCount, comments: allComments.length },
        'Reached maximum page limit — stopping pagination'
      );
      break;
    }

    if (maxComments && allComments.length >= maxComments) {
      logger.info(
        { videoId, comments: allComments.length, maxComments },
        'Reached maxComments limit — stopping pagination'
      );
      break;
    }
  } while (nextToken);

  logger.info(
    { videoId, totalPages: pageCount, totalComments: allComments.length },
    'All YouTube comments fetched'
  );

  // Post-fetch sort for 'likes' (YouTube API can only sort by time natively)
  if (sort === 'likes') {
    allComments.sort((a, b) => b.likeCount - a.likeCount);
  }

  return {
    video,
    comments: allComments,
    nextPageToken: undefined, // All pages consumed
    totalResults: totalResults ?? allComments.length,
  };
}

// -----------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------

async function fetchVideoMetadata(videoId: string): Promise<YouTubeVideo> {
  try {
    const response = await axios.get<YouTubeVideoListResponse>(
      `${YOUTUBE_API_BASE}/videos`,
      {
        params: {
          part: 'snippet,status',
          id: videoId,
          key: env.YOUTUBE_API_KEY,
        },
        timeout: 10_000,
      }
    );

    const items = response.data.items;
    if (!items || items.length === 0) {
      throw new YouTubeVideoNotFoundError(
        `No video found with ID: ${videoId}`
      );
    }

    const item = items[0];
    const status = item.status?.privacyStatus;

    if (status === 'private') {
      throw new YouTubePrivateVideoError();
    }

    if (status === 'unlisted') {
      logger.warn({ videoId }, 'Video is unlisted but accessible');
    }

    return {
      videoId,
      title: item.snippet?.title ?? 'Untitled Video',
      channelTitle: item.snippet?.channelTitle,
    };
  } catch (err) {
    if (
      err instanceof YouTubeVideoNotFoundError ||
      err instanceof YouTubePrivateVideoError
    ) {
      throw err;
    }
    return handleYouTubeAxiosError(err);
  }
}

async function fetchCommentThreads(params: {
  videoId: string;
  maxResults: number;
  pageToken?: string;
  sort: 'recent' | 'likes' | 'toxicity';
}): Promise<{
  comments: YouTubeComment[];
  nextPageToken?: string;
  totalResults?: number;
}> {
  const { videoId, maxResults, pageToken, sort } = params;

  // YouTube API sort order mapping:
  // 'toxicity' and 'likes' are handled post-fetch — fetch by 'time' (newest first)
  // YouTube API's 'relevance' does NOT sort by like count
  const order = 'time';

  try {
    const response = await axios.get<YouTubeCommentThreadsResponse>(
      `${YOUTUBE_API_BASE}/commentThreads`,
      {
        params: {
          part: 'snippet',
          videoId,
          maxResults: Math.min(maxResults, 100),
          pageToken: pageToken || undefined,
          order,
          key: env.YOUTUBE_API_KEY,
          textFormat: 'plainText',
        },
        timeout: 15_000,
      }
    );

    const items = response.data.items ?? [];

    if (items.length === 0 && !pageToken) {
      logger.info({ videoId }, 'No comments found for video');
    }

    const comments: YouTubeComment[] = items
      .map((item) => {
        const snippet = item.snippet?.topLevelComment?.snippet;
        if (!snippet) return null;

        return {
          id: item.snippet?.topLevelComment?.id ?? item.id,
          author: snippet.authorDisplayName ?? 'Anonymous',
          text: snippet.textOriginal ?? snippet.textDisplay ?? '',
          likeCount: snippet.likeCount ?? 0,
          publishedAt: snippet.publishedAt ?? new Date().toISOString(),
        } satisfies YouTubeComment;
      })
      .filter((c): c is YouTubeComment => c !== null && c.text.trim() !== '');

    // Post-fetch sorting for 'likes' (YouTube API cannot natively sort by like count)
    if (sort === 'likes') {
      comments.sort((a, b) => b.likeCount - a.likeCount);
    }

    return {
      comments,
      nextPageToken: response.data.nextPageToken,
      totalResults: response.data.pageInfo?.totalResults,
    };
  } catch (err) {
    return handleYouTubeAxiosError(err);
  }
}

function handleYouTubeAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const errorData = err.response?.data as {
      error?: { errors?: Array<{ reason?: string }>; message?: string };
    };
    const youtubeReason =
      errorData?.error?.errors?.[0]?.reason ?? '';

    logger.error(
      { status, reason: youtubeReason },
      'YouTube API error'
    );

    if (status === 403) {
      if (
        youtubeReason === 'quotaExceeded' ||
        youtubeReason === 'dailyLimitExceeded'
      ) {
        throw new YouTubeQuotaExceededError();
      }
      if (youtubeReason === 'commentsDisabled') {
        throw new YouTubeCommentsDisabledError();
      }
      throw new YouTubeApiError('Access to this video is forbidden', 403);
    }

    if (status === 404) {
      throw new YouTubeVideoNotFoundError();
    }

    if (err.code === 'ECONNABORTED') {
      throw new YouTubeApiError('YouTube API request timed out', 408);
    }

    throw new YouTubeApiError(
      errorData?.error?.message ?? 'YouTube API request failed',
      status
    );
  }

  throw new YouTubeApiError(`Unexpected YouTube service error: ${String(err)}`);
}
