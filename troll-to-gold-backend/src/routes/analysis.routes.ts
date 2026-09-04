import { Router } from 'express';
import { analyzeController } from '../controllers/analysis.controller';
import { validate } from '../middleware/validation.middleware';
import { analyzeRequestSchema } from '../schemas/analysis.schema';

const router = Router();

/**
 * POST /api/analyze
 * Analyze a comment — returns toxicity, intent, and strategy.
 * Does NOT generate replies.
 */
router.post('/', validate(analyzeRequestSchema), analyzeController);

export default router;
