import { z } from 'zod';
import { VALID_STRATEGIES } from '../types';

// -----------------------------------------------------------
// Analysis request schema
// -----------------------------------------------------------

export const analyzeRequestSchema = z.object({
  comment: z
    .string({ required_error: 'comment is required' })
    .trim()
    .min(1, 'comment cannot be empty')
    .max(2000, 'comment cannot exceed 2000 characters'),
  videoTitle: z.string().max(500).optional(),
  author: z.string().max(200).optional(),
  context: z.string().max(500).optional(),
});

export type AnalyzeRequestBody = z.infer<typeof analyzeRequestSchema>;
