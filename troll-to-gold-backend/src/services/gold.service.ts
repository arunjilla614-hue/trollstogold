import { Reply, Severity, IntentType, Strategy } from '../types';
import { clamp, safeNumber } from '../utils/json.utils';
import { sanitizeReplyText } from '../utils/sanitizer';
import { createLogger } from '../utils/logger';

const logger = createLogger('gold-service');

// ============================================================
// GOLD POTENTIAL SERVICE
// ============================================================
// Gold Potential (0-100) measures the shareable, engagement potential
// of turning a comment into an entertaining reply.
//
// IMPORTANT: Gold ≠ Toxicity.
// - A highly toxic hate comment → low Gold (not worth engaging)
// - A playful troll comment → potentially very high Gold
// ============================================================

// Safety cap — these conditions force a low Gold ceiling regardless of AI output
const GOLD_SAFETY_CAPS: Array<{
  condition: (params: GoldCapParams) => boolean;
  cap: number;
  reason: string;
}> = [
  {
    condition: (p) => p.severity === 'critical',
    cap: 15,
    reason: 'Critical severity content should not be amplified',
  },
  {
    condition: (p) => p.intentType === 'hate',
    cap: 10,
    reason: 'Hate content must not receive a high engagement score',
  },
  {
    condition: (p) => p.intentType === 'harassment',
    cap: 20,
    reason: 'Harassment content should not be amplified',
  },
  {
    condition: (p) => p.strategy === 'ignore',
    cap: 5,
    reason: 'Ignored comments should not receive a high Gold score',
  },
];

interface GoldCapParams {
  severity: Severity;
  intentType: IntentType;
  strategy: Strategy;
}

/**
 * Validate and clamp a raw Gold score from the AI.
 * Applies safety caps based on severity and intent.
 */
export function validateGoldScore(
  rawScore: unknown,
  params: GoldCapParams
): number {
  // First clamp to 0-100; default to 0 for missing/invalid scores (unknown ≠ medium)
  let score = safeNumber(rawScore, 0, 100, 0);

  // Apply safety caps
  for (const rule of GOLD_SAFETY_CAPS) {
    if (rule.condition(params)) {
      if (score > rule.cap) {
        logger.debug(
          { rawScore, cappedAt: rule.cap, reason: rule.reason },
          'Gold score safety cap applied'
        );
        score = rule.cap;
        break; // Apply the strictest cap (first match wins)
      }
    }
  }

  return Math.round(score);
}

/**
 * Validate and sanitize all replies from AI output.
 * Ensures Gold scores are valid and text is safe.
 */
export function validateAndSanitizeReplies(
  rawReplies: unknown[],
  strategy: Strategy,
  params: GoldCapParams
): Reply[] {
  if (!Array.isArray(rawReplies) || rawReplies.length === 0) {
    return [];
  }

  const validated: Reply[] = [];
  const maxReplies = 5;

  for (let i = 0; i < Math.min(rawReplies.length, maxReplies); i++) {
    const raw = rawReplies[i] as Record<string, unknown>;

    const text = sanitizeReplyText(raw['text']);
    if (!text) {
      logger.warn({ index: i }, 'Skipping reply with empty text');
      continue;
    }

    const goldScore = validateGoldScore(raw['gold_potential'], params);

    validated.push({
      id: `reply_${i + 1}`,
      text,
      style: strategy,
      gold_potential: goldScore,
    });
  }

  return validated;
}

/**
 * Ensure minimum 3 replies. If AI returned fewer, this returns
 * what we have (the caller will handle the error case).
 */
export function hasMinimumReplies(replies: Reply[]): boolean {
  return replies.length >= 3;
}
