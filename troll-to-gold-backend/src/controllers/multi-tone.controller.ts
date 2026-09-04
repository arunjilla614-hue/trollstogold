import { Request, Response, NextFunction } from 'express';
import { generateMultiToneSuggestions } from '../services/multi-tone.service';
import { Severity, IntentType } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('multi-tone-controller');

// ============================================================
// POST /api/suggest-responses
// ============================================================
// Generates all 6 tone suggestions for a selected comment
// in a single Featherless AI request.
//
// Request body:
// {
//   comment: string,             // Required
//   toxicityScore?: number,      // 0-100 (from prior analysis)
//   toxicitySeverity?: string,   // 'low' | 'mild' | 'medium' | 'high' | 'critical'
//   intentType?: string,         // e.g. 'insult' | 'harassment' | ...
//   author?: string              // Comment author name (for context)
// }
//
// Response:
// {
//   success: true,
//   data: {
//     suggestions: [
//       { tone: "Witty", reply: "...", goldScore: 87, emoji: "😂" },
//       { tone: "Sarcastic", reply: "...", goldScore: 82, emoji: "😏" },
//       { tone: "Professional", reply: "...", goldScore: 76, emoji: "💼" },
//       { tone: "Savage", reply: "...", goldScore: 91, emoji: "🔥" },
//       { tone: "Kind", reply: "...", goldScore: 68, emoji: "❤️" },
//       { tone: "Clout Booster", reply: "...", goldScore: 89, emoji: "🚀" }
//     ],
//     safetyNote: null | "Savage tone softened due to high severity"
//   }
// }
// ============================================================

export async function suggestResponsesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      comment,
      toxicityScore,
      toxicitySeverity,
      intentType,
      author,
    } = req.body as {
      comment?: string;
      toxicityScore?: number;
      toxicitySeverity?: string;
      intentType?: string;
      author?: string;
    };

    // Validate required field
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'comment is required and must be a non-empty string',
        },
      });
      return;
    }

    logger.info(
      {
        commentLength: comment.length,
        toxicityScore,
        toxicitySeverity,
        intentType,
      },
      'POST /api/suggest-responses'
    );

    const result = await generateMultiToneSuggestions({
      comment: comment.trim(),
      toxicityScore:
        toxicityScore !== undefined ? Number(toxicityScore) : undefined,
      toxicitySeverity: toxicitySeverity as Severity | undefined,
      intentType: intentType as IntentType | undefined,
      author: author?.slice(0, 100),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
