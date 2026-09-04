import { Router } from 'express';
import {
  youtubeCommentsController,
  youtubeAllCommentsController,
} from '../controllers/youtube.controller';
import { youtubeAnalyzeController } from '../controllers/youtube-analyze.controller';
import { validate } from '../middleware/validation.middleware';
import { youtubeCommentsRequestSchema } from '../schemas/youtube.schema';

const router = Router();

/**
 * POST /api/youtube/comments
 * Fetch YouTube comments for a video URL (single page, up to maxResults).
 */
router.post(
  '/comments',
  validate(youtubeCommentsRequestSchema),
  youtubeCommentsController
);

/**
 * POST /api/youtube/comments/all
 * Fetch ALL available YouTube comments using nextPageToken pagination.
 * No artificial total comment limit.
 */
router.post('/comments/all', youtubeAllCommentsController);

/**
 * POST /api/youtube/analyze
 * Full pipeline: fetch ALL comments + analyze each one via Featherless AI.
 * Uses controlled batching with concurrency limits.
 */
router.post('/analyze', youtubeAnalyzeController);

export default router;
