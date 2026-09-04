import { Router, Request, Response } from 'express';
import { getHistory, addHistoryEntry } from '../services/history.service';
import { z } from 'zod';
import { VALID_STRATEGIES } from '../types';

const router = Router();

/**
 * GET /api/history
 * Return recent analysis history (newest first).
 */
router.get('/', (req: Request, res: Response) => {
  const limitParam = Number(req.query['limit']) || 20;
  const offsetParam = Number(req.query['offset']) || 0;

  const limit = Math.min(Math.max(1, limitParam), 100);
  const offset = Math.max(0, offsetParam);

  const entries = getHistory(limit, offset);

  res.status(200).json({
    success: true,
    data: {
      entries,
      count: entries.length,
    },
  });
});

/**
 * POST /api/history
 * Record a selected reply in history.
 */
const historyPostSchema = z.object({
  comment: z.string().min(1).max(2000),
  strategy: z.enum(VALID_STRATEGIES as [string, ...string[]]),
  toxicityScore: z.number().min(0).max(100),
  goldScore: z.number().min(0).max(100),
  selectedReply: z.string().max(600).optional(),
});

router.post('/', (req: Request, res: Response) => {
  const result = historyPostSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid history entry data',
      },
    });
    return;
  }

  const entry = addHistoryEntry(result.data as Parameters<typeof addHistoryEntry>[0]);

  res.status(201).json({
    success: true,
    data: entry,
  });
});

export default router;
