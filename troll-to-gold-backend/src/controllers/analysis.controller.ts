import { Request, Response, NextFunction } from 'express';
import { analyzeComment } from '../services/analysis.service';
import { AnalyzeRequestBody } from '../schemas/analysis.schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('analysis-controller');

/**
 * POST /api/analyze
 * Analyze a comment for toxicity, intent, and recommended strategy.
 * Does NOT generate replies.
 */
export async function analyzeController(
  req: Request<object, object, AnalyzeRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { comment, videoTitle, author, context } = req.body;

    logger.info(
      { commentLength: comment.length, hasContext: !!context },
      'POST /api/analyze'
    );

    const result = await analyzeComment({
      comment,
      videoTitle,
      author,
      context,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
