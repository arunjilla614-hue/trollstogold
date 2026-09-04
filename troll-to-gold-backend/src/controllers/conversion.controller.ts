import { Request, Response, NextFunction } from 'express';
import { analyzeComment, generateReplies } from '../services/analysis.service';
import { addHistoryEntry } from '../services/history.service';
import {
  ConvertRequestBody,
  GenerateRepliesRequestBody,
} from '../schemas/conversion.schema';
import { Strategy } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('conversion-controller');

// ============================================================
// POST /api/convert — Full pipeline
// ============================================================

export async function convertController(
  req: Request<object, object, ConvertRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { comment, strategy: requestedStrategy } = req.body;

    logger.info(
      { commentLength: comment.length, requestedStrategy },
      'POST /api/convert'
    );

    // Step 1: Analyze — toxicity, intent, strategy recommendation
    const analysis = await analyzeComment({ comment });

    const { toxicity, intent, strategy: strategyResult } = analysis;

    // Step 2: Determine which strategy to use
    // Creator-selected strategy takes precedence IF it's valid and not escalating
    const recommendedStrategy = strategyResult.recommended;
    const usedStrategy: Strategy = (requestedStrategy as Strategy) ?? recommendedStrategy;

    // Step 3: Generate replies using the selected strategy
    const replies = await generateReplies({
      comment,
      strategy: usedStrategy,
      toxicityScore: toxicity.score,
      intentType: intent.type,
      severity: toxicity.severity,
    });

    // Step 4: Record in history (async fire-and-forget)
    const topGoldScore = replies.length > 0 ? replies[0].gold_potential : 0;
    addHistoryEntry({
      comment,
      strategy: usedStrategy,
      toxicityScore: toxicity.score,
      goldScore: topGoldScore,
    });

    res.status(200).json({
      success: true,
      data: {
        comment,
        toxicity,
        intent,
        strategy: {
          recommended: recommendedStrategy,
          used: usedStrategy,
          reason: strategyResult.reason,
        },
        replies,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// POST /api/generate-replies — Replies only
// ============================================================

export async function generateRepliesController(
  req: Request<object, object, GenerateRepliesRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { comment, strategy } = req.body;

    logger.info(
      { commentLength: comment.length, strategy },
      'POST /api/generate-replies'
    );

    const replies = await generateReplies({
      comment,
      strategy: strategy as Strategy,
    });

    res.status(200).json({
      success: true,
      data: {
        replies,
      },
    });
  } catch (err) {
    next(err);
  }
}
