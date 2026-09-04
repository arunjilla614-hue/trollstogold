import { Router } from 'express';
import { categoryResponseController } from '../controllers/category-response.controller';

const router = Router();

/**
 * POST /api/category-response
 *
 * Matches the frontend CategoryResponse.jsx commented-out API call.
 *
 * Request body:
 * {
 *   category: string,               // "toxic" | "neutral" | "praise"
 *   action: string,                 // "respond" | "ignore" | "legal"
 *   tone?: string,                  // e.g. "Calm & Professional"
 *   responseTemplate?: string|null, // selected reply text
 *   commentIds?: (string|number)[]  // IDs of comments in this category
 * }
 */
router.post('/', categoryResponseController);

export default router;
