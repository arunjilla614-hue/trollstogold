import { z } from 'zod';
import { VALID_STRATEGIES } from '../types';

// -----------------------------------------------------------
// Conversion request schema (/api/convert)
// -----------------------------------------------------------

export const convertRequestSchema = z.object({
  comment: z
    .string({ required_error: 'comment is required' })
    .trim()
    .min(1, 'comment cannot be empty')
    .max(2000, 'comment cannot exceed 2000 characters'),
  strategy: z
    .enum(VALID_STRATEGIES as [string, ...string[]], {
      errorMap: () => ({
        message: `strategy must be one of: ${VALID_STRATEGIES.join(', ')}`,
      }),
    })
    .optional(),
});

// -----------------------------------------------------------
// Generate replies request schema (/api/generate-replies)
// -----------------------------------------------------------

export const generateRepliesRequestSchema = z.object({
  comment: z
    .string({ required_error: 'comment is required' })
    .trim()
    .min(1, 'comment cannot be empty')
    .max(2000, 'comment cannot exceed 2000 characters'),
  strategy: z.enum(VALID_STRATEGIES as [string, ...string[]], {
    errorMap: () => ({
      message: `strategy must be one of: ${VALID_STRATEGIES.join(', ')}`,
    }),
  }),
});

export type ConvertRequestBody = z.infer<typeof convertRequestSchema>;
export type GenerateRepliesRequestBody = z.infer<
  typeof generateRepliesRequestSchema
>;
