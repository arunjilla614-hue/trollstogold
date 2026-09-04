import { Request, Response, NextFunction } from 'express';
import { fetchYouTubeComments, fetchAllYouTubeComments } from '../services/youtube.service';
import { YouTubeCommentsRequestBody } from '../schemas/youtube.schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('youtube-controller');

/**
 * POST /api/youtube/comments
 * Fetch and normalize YouTube comments for a video URL (single page).
 */
export async function youtubeCommentsController(
  req: Request<object, object, YouTubeCommentsRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { videoUrl, maxResults, pageToken, sort } = req.body;

    logger.info({ sort, maxResults }, 'POST /api/youtube/comments');

    const result = await fetchYouTubeComments({
      videoUrl,
      maxResults,
      pageToken,
      sort,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/youtube/comments/all
 * Fetch ALL available YouTube comments for a video URL.
 * Uses nextPageToken pagination — no artificial comment limit.
 */
export async function youtubeAllCommentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { videoUrl, sort } = req.body as { videoUrl?: string; sort?: 'recent' | 'likes' | 'toxicity' };

    if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'videoUrl is required',
        },
      });
      return;
    }

    logger.info({ sort }, 'POST /api/youtube/comments/all');

    const result = await fetchAllYouTubeComments({
      videoUrl: videoUrl.trim(),
      sort,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
