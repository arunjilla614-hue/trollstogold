import { Router } from 'express';
import {
  convertController,
  generateRepliesController,
} from '../controllers/conversion.controller';
import { suggestResponsesController } from '../controllers/multi-tone.controller';
import { validate } from '../middleware/validation.middleware';
import {
  convertRequestSchema,
  generateRepliesRequestSchema,
} from '../schemas/conversion.schema';

const router = Router();

/**
 * POST /api/convert
 * Full pipeline: analyze + generate replies + gold scoring.
 */
router.post('/convert', validate(convertRequestSchema), convertController);

/**
 * POST /api/generate-replies
 * Generate replies for a comment with a specified strategy.
 */
router.post(
  '/generate-replies',
  validate(generateRepliesRequestSchema),
  generateRepliesController
);

/**
 * POST /api/suggest-responses
 * Generate all 6 tone-based suggestions for a selected comment in one AI request.
 * No prior analysis required — pass toxicity/intent from existing analysis if available.
 */
router.post('/suggest-responses', suggestResponsesController);

export default router;

