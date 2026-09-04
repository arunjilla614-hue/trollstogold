import { z } from 'zod';

// -----------------------------------------------------------
// YouTube comments request schema
// -----------------------------------------------------------

export const youtubeCommentsRequestSchema = z.object({
  videoUrl: z
    .string({ required_error: 'videoUrl is required' })
    .trim()
    .min(1, 'videoUrl cannot be empty')
    .refine(
      (url) => {
        try {
          const u = new URL(url);
          return (
            u.hostname === 'www.youtube.com' ||
            u.hostname === 'youtube.com' ||
            u.hostname === 'youtu.be' ||
            u.hostname === 'm.youtube.com'
          );
        } catch {
          return false;
        }
      },
      { message: 'videoUrl must be a valid YouTube URL' }
    ),
  maxResults: z.coerce.number().int().min(1).max(100).default(50),
  pageToken: z.string().optional(),
  sort: z.enum(['recent', 'likes', 'toxicity']).default('recent'),
});

export type YouTubeCommentsRequestBody = z.infer<
  typeof youtubeCommentsRequestSchema
>;
