import { Request, Response, NextFunction } from 'express';
import { fetchAllYouTubeComments } from '../services/youtube.service';
import { analyzeCommentsBatch } from '../services/batch-analysis.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('youtube-analyze-controller');

// ============================================================
// POST /api/youtube/analyze
// ============================================================
// Full pipeline: fetch ALL comments from a YouTube video,
// then analyze each one using Featherless AI in controlled batches.
//
// Request body:
// {
//   videoUrl: string,        // YouTube video URL (required)
//   sort?: string,           // "recent" | "likes" | "toxicity" (optional)
//   maxComments?: number     // Optional cap on number of comments to analyze
//                            // (useful for very large videos to manage cost/time)
// }
//
// Response:
// {
//   success: true,
//   data: {
//     video: { videoId, title, channelTitle },
//     total: number,
//     succeeded: number,
//     failed: number,
//     results: [{
//       comment: { id, author, text, likeCount, publishedAt },
//       analysis: { toxicity, intent, strategy } | null,
//       error?: string
//     }]
//   }
// }
// ============================================================

export async function youtubeAnalyzeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { videoUrl, sort, maxComments } = req.body as {
      videoUrl?: string;
      sort?: 'recent' | 'likes' | 'toxicity';
      maxComments?: number;
    };

    if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === '') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'videoUrl is required' },
      });
      return;
    }

    logger.info({ sort, maxComments }, 'POST /api/youtube/analyze — starting pipeline');

    // Step 1: Fetch all comments
    const youtubeResult = await fetchAllYouTubeComments({
      videoUrl: videoUrl.trim(),
      sort,
      maxComments,
    });

    let commentsToAnalyze = youtubeResult.comments;

    // Optional hard cap to limit analysis cost for very large videos
    if (maxComments && maxComments > 0 && commentsToAnalyze.length > maxComments) {
      logger.info(
        { original: commentsToAnalyze.length, capped: maxComments },
        'Applying maxComments cap'
      );
      commentsToAnalyze = commentsToAnalyze.slice(0, maxComments);
    }

    logger.info(
      { commentCount: commentsToAnalyze.length },
      'Starting batch AI analysis'
    );

    // Step 2: Batch analyze with concurrency control
    const batchResult = await analyzeCommentsBatch(
      commentsToAnalyze,
      youtubeResult.video.title
    );

    res.status(200).json({
      success: true,
      data: {
        video: youtubeResult.video,
        total: batchResult.total,
        succeeded: batchResult.succeeded,
        failed: batchResult.failed,
        results: batchResult.results,
      },
    });
  } catch (err) {
    next(err);
  }
}
