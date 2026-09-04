import { Router, Request, Response } from 'express';
import { isDemoMode } from '../config/env';

const router = Router();

/**
 * GET /api/health
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'troll-to-gold-backend',
    status: 'healthy',
    aiProvider: 'featherless',
    demoMode: isDemoMode,
    timestamp: new Date().toISOString(),
  });
});

export default router;
