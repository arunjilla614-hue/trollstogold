import { z } from 'zod';
import { callFeatherless } from './featherless.service';
import {
  MULTI_TONE_SYSTEM_PROMPT,
  MULTI_TONE_RETRY_SYSTEM_PROMPT,
  buildMultiToneUserPrompt,
  buildMultiToneRetryPrompt,
  TONE_EMOJIS,
  TONE_ORDER,
} from '../prompts/multi-tone.prompt';
import { safeParseJSON } from '../utils/json.utils';
import { sanitizeReplyText } from '../utils/sanitizer';
import { createLogger } from '../utils/logger';
import {
  ToneSuggestion,
  MultiToneResponse,
  Severity,
  IntentType,
  ToneLabel,
} from '../types';
import { DEMO_MULTI_TONE_RESPONSE } from './demo.data';
import { isDemoMode } from '../config/env';

const logger = createLogger('multi-tone-service');

// ============================================================
// Zod schema for AI output validation
// ============================================================

const toneLabelValues: [ToneLabel, ...ToneLabel[]] = [
  'Witty',
  'Sarcastic',
  'Professional',
  'Savage',
  'Kind',
  'Clout Booster',
];

const suggestionSchema = z.object({
  tone: z.enum(toneLabelValues),
  reply: z.string().min(1),
  goldScore: z.coerce.number().min(0).max(100),
});

const multiToneOutputSchema = z.object({
  suggestions: z.array(suggestionSchema).min(1),
});

// ============================================================
// Safety thresholds
// ============================================================

// At these severity levels, "Savage" is softened to "Firm"
const HIGH_SEVERITY_LABELS: Severity[] = ['high', 'critical'];

// At these intent types, Savage is softened regardless of severity
const DANGEROUS_INTENT_TYPES: IntentType[] = ['hate', 'harassment'];

// Gold score safety caps (mirroring gold.service.ts logic)
const GOLD_CAPS: Array<{
  condition: (s: Severity | undefined, i: IntentType | undefined) => boolean;
  cap: number;
}> = [
  { condition: (s) => s === 'critical', cap: 15 },
  { condition: (_s, i) => i === 'hate', cap: 10 },
  { condition: (_s, i) => i === 'harassment', cap: 25 },
  { condition: (s) => s === 'high', cap: 50 },
];

function applyGoldCap(score: number, severity?: Severity, intentType?: IntentType): number {
  for (const rule of GOLD_CAPS) {
    if (rule.condition(severity, intentType)) {
      return Math.min(score, rule.cap);
    }
  }
  return score;
}

// ============================================================
// Main service function
// ============================================================

export async function generateMultiToneSuggestions(params: {
  comment: string;
  toxicityScore?: number;
  toxicitySeverity?: Severity;
  intentType?: IntentType;
  author?: string;
}): Promise<MultiToneResponse> {
  // Demo mode
  if (isDemoMode) {
    logger.info('Demo mode: returning mock multi-tone suggestions');
    return DEMO_MULTI_TONE_RESPONSE;
  }

  const { comment, toxicityScore, toxicitySeverity, intentType, author } = params;

  // Determine if Savage tone needs softening
  const shouldSoftenSavage =
    (toxicitySeverity !== undefined && HIGH_SEVERITY_LABELS.includes(toxicitySeverity)) ||
    (intentType !== undefined && DANGEROUS_INTENT_TYPES.includes(intentType));

  let safetyNote: string | null = null;
  if (shouldSoftenSavage) {
    safetyNote = `"Savage" tone softened to "Firm" due to ${toxicitySeverity ?? intentType} severity content.`;
    logger.info({ toxicitySeverity, intentType }, 'Softening Savage tone due to high severity');
  }

  logger.info(
    { commentLength: comment.length, toxicitySeverity, shouldSoftenSavage },
    'Generating multi-tone suggestions via Featherless AI'
  );

  const userPrompt = buildMultiToneUserPrompt({
    comment,
    toxicityScore,
    toxicitySeverity,
    intentType,
    author,
    savageSoftened: shouldSoftenSavage,
  });

  // --- First attempt ---
  let raw = await callFeatherless({
    messages: [
      { role: 'system', content: MULTI_TONE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 900,
  });

  let parsed = safeParseJSON<unknown>(raw);

  // --- Retry if JSON is malformed ---
  if (!parsed) {
    logger.warn('Multi-tone first attempt returned invalid JSON, retrying...');
    raw = await callFeatherless({
      messages: [
        { role: 'system', content: MULTI_TONE_RETRY_SYSTEM_PROMPT },
        { role: 'user', content: buildMultiToneRetryPrompt(comment) },
      ],
      temperature: 0.3,
      maxTokens: 900,
    });
    parsed = safeParseJSON<unknown>(raw);
  }

  if (!parsed) {
    logger.error('Multi-tone retry also returned invalid JSON');
    throw new MultiToneAIError('AI returned unparseable JSON for multi-tone suggestions');
  }

  // --- Validate with Zod ---
  const validated = multiToneOutputSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error({ errors: validated.error.format() }, 'Multi-tone output failed schema validation');
    throw new MultiToneAIError('Multi-tone output failed schema validation');
  }

  // --- Build final suggestions, ensuring all 6 tones are present ---
  const rawByTone = new Map(
    validated.data.suggestions.map((s) => [s.tone, s])
  );

  const suggestions: ToneSuggestion[] = TONE_ORDER.map((tone) => {
    const raw = rawByTone.get(tone);

    // Fallback if AI missed a tone
    if (!raw || !raw.reply.trim()) {
      logger.warn({ tone }, 'AI did not return this tone — using fallback');
      return {
        tone,
        reply: getDefaultReply(tone, comment),
        goldScore: 50,
        emoji: TONE_EMOJIS[tone] ?? '✨',
      };
    }

    // Sanitize text
    const cleanReply = sanitizeReplyText(raw.reply) ?? getDefaultReply(tone, comment);

    // Apply gold safety caps
    const goldScore = applyGoldCap(
      Math.round(Math.min(100, Math.max(0, raw.goldScore))),
      toxicitySeverity,
      intentType
    );

    return {
      tone,
      reply: cleanReply,
      goldScore,
      emoji: TONE_EMOJIS[tone] ?? '✨',
    };
  });

  logger.info(
    { toneCount: suggestions.length, safetyNote },
    'Multi-tone suggestions generated'
  );

  return { suggestions, safetyNote };
}

// ============================================================
// Default fallback replies per tone
// ============================================================

function getDefaultReply(tone: ToneLabel, _comment: string): string {
  const defaults: Record<ToneLabel, string> = {
    Witty: "Thanks for the feedback — noted with a smile! 😄",
    Sarcastic: "Wow, truly appreciate the... input. 🙄",
    Professional: "Thank you for sharing your thoughts. I take all feedback seriously.",
    Savage: "Bold of you to assume I'd lose sleep over this.",
    Kind: "I appreciate you engaging with my content. I hope we can keep things constructive.",
    'Clout Booster': "Drop your hottest take below — let's talk! 👇",
  };
  return defaults[tone];
}

// ============================================================
// Custom error
// ============================================================

export class MultiToneAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiToneAIError';
  }
}
