import { Request, Response } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('category-response-controller');

// ============================================================
// POST /api/category-response
// ============================================================
// Matches the frontend's CategoryResponse.jsx commented-out API call:
//
//   const payload = {
//     category,               // "toxic" | "neutral" | "praise"
//     action: selectedAction, // "respond" | "ignore" | "legal"
//     tone: selectedTone,     // "Calm & Professional" | "Empathetic" | "Friendly" | "Firm"
//     responseTemplate: selectedReply, // string | null
//     commentIds: comments.map((comment) => comment.id) // number[]
//   };
//
//   fetch("http://localhost:5000/api/category-response", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload)
//   });
// ============================================================

interface CategoryResponseBody {
  category: string;
  action: 'respond' | 'ignore' | 'legal';
  tone?: string;
  responseTemplate?: string | null;
  commentIds?: (string | number)[];
}

export async function categoryResponseController(
  req: Request,
  res: Response
): Promise<void> {
  const { category, action, tone, responseTemplate, commentIds } =
    req.body as CategoryResponseBody;

  // Basic validation
  if (!category || typeof category !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'category is required' },
    });
    return;
  }

  if (!action || !['respond', 'ignore', 'legal'].includes(action)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'action must be one of: respond, ignore, legal',
      },
    });
    return;
  }

  const ids = Array.isArray(commentIds) ? commentIds : [];

  logger.info(
    { category, action, tone, commentCount: ids.length },
    'POST /api/category-response'
  );

  // Determine outcome message based on action
  let message: string;
  let appliedTo: number = ids.length;

  switch (action) {
    case 'respond':
      message = tone
        ? `Response strategy "${tone}" will be applied to ${appliedTo} ${category} comment(s).`
        : `Response strategy applied to ${appliedTo} ${category} comment(s).`;
      break;
    case 'ignore':
      message = `${appliedTo} ${category} comment(s) marked to be ignored.`;
      break;
    case 'legal':
      message = `${appliedTo} ${category} comment(s) flagged for legal review.`;
      break;
  }

  res.status(200).json({
    success: true,
    data: {
      category,
      action,
      tone: tone ?? null,
      responseTemplate: responseTemplate ?? null,
      commentIds: ids,
      appliedCount: appliedTo,
      message,
    },
  });
}
