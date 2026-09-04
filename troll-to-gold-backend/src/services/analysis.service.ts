import { z } from 'zod';
import { callFeatherless } from './featherless.service';
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  ANALYSIS_RETRY_SYSTEM_PROMPT,
  buildAnalysisRetryUserPrompt,
} from '../prompts/analysis.prompt';
import {
  REPLY_SYSTEM_PROMPT,
  buildReplyUserPrompt,
  REPLY_RETRY_SYSTEM_PROMPT,
  buildReplyRetryUserPrompt,
} from '../prompts/reply.prompt';
import { safeParseJSON, clamp } from '../utils/json.utils';
import { sanitizeReason } from '../utils/sanitizer';
import { validateAndSanitizeReplies, hasMinimumReplies } from './gold.service';
import { createLogger } from '../utils/logger';
import {
  AnalysisResult,
  Reply,
  Strategy,
  ToxicityLabel,
  Severity,
  IntentType,
  VALID_STRATEGIES,
} from '../types';
import { DEMO_ANALYSIS_RESULT, DEMO_REPLIES } from './demo.data';
import { isDemoMode } from '../config/env';

const logger = createLogger('analysis-service');

// ============================================================
// Zod schemas for AI output validation
// ============================================================

const toxicityLabelValues: [ToxicityLabel, ...ToxicityLabel[]] = [
  'non_toxic',
  'criticism',
  'mildly_toxic',
  'toxic',
  'highly_toxic',
];

const severityValues: [Severity, ...Severity[]] = [
  'low',
  'mild',
  'medium',
  'high',
  'critical',
];

const intentTypeValues: [IntentType, ...IntentType[]] = [
  'genuine_criticism',
  'playful_trolling',
  'sarcasm',
  'insult',
  'harassment',
  'hate',
  'disagreement',
  'misinformation_claim',
  'spam',
  'praise',
  'neutral',
  'other',
];

const strategyValues: [Strategy, ...Strategy[]] = [
  'comedian_comeback',
  'shakespearean_roast',
  'sarcastic_hr',
  'clout_booster',
  'kind_redirect',
  'ignore',
];

const analysisOutputSchema = z.object({
  toxicity: z.object({
    score: z.coerce.number().min(0).max(100),
    label: z.enum(toxicityLabelValues),
    severity: z.enum(severityValues),
    reason: z.string().catch('No reason provided.'),
  }),
  intent: z.object({
    type: z.enum(intentTypeValues),
    confidence: z.coerce.number().min(0).max(1),
    reason: z.string().catch('No reason provided.'),
  }),
  strategy: z.object({
    recommended: z.enum(strategyValues),
    reason: z.string().catch('No reason provided.'),
  }),
});

const repliesOutputSchema = z.object({
  replies: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().min(1),
      style: z.string().optional(),
      gold_potential: z.coerce.number().min(0).max(100),
    })
  ).min(1),
});

// ============================================================
// ANALYSIS — Toxicity + Intent + Strategy
// ============================================================

export async function analyzeComment(params: {
  comment: string;
  videoTitle?: string;
  author?: string;
  context?: string;
}): Promise<AnalysisResult> {
  // Demo mode returns mock data
  if (isDemoMode) {
    logger.info('Demo mode: returning mock analysis result');
    return DEMO_ANALYSIS_RESULT;
  }

  const userPrompt = buildAnalysisUserPrompt(params);

  logger.info({ commentLength: params.comment.length }, 'Analyzing comment');

  // --- First attempt ---
  let raw = await callFeatherless({
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 600,
  });

  let parsed = safeParseJSON<unknown>(raw);

  // --- Retry if first attempt produced bad JSON ---
  if (!parsed) {
    logger.warn('First analysis attempt returned invalid JSON, retrying...');

    raw = await callFeatherless({
      messages: [
        { role: 'system', content: ANALYSIS_RETRY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildAnalysisRetryUserPrompt(params.comment),
        },
      ],
      temperature: 0.1,
      maxTokens: 600,
    });

    parsed = safeParseJSON<unknown>(raw);
  }

  if (!parsed) {
    logger.error('Analysis retry also returned invalid JSON');
    throw new InvalidAIResponseError('Analysis AI returned unparseable JSON');
  }

  // --- Schema validation ---
  const validated = analysisOutputSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error(
      { errors: validated.error.format() },
      'Analysis output failed schema validation'
    );
    throw new InvalidAIResponseError(
      'Analysis output failed schema validation'
    );
  }

  const data = validated.data;

  return {
    toxicity: {
      score: Math.round(clamp(data.toxicity.score, 0, 100)),
      label: data.toxicity.label,
      severity: data.toxicity.severity,
      reason: sanitizeReason(data.toxicity.reason),
    },
    intent: {
      type: data.intent.type,
      confidence: Math.round(clamp(data.intent.confidence * 100, 0, 100)) / 100,
      reason: sanitizeReason(data.intent.reason),
    },
    strategy: {
      recommended: data.strategy.recommended,
      reason: sanitizeReason(data.strategy.reason),
    },
  };
}

// ============================================================
// REPLY GENERATION
// ============================================================

export async function generateReplies(params: {
  comment: string;
  strategy: Strategy;
  toxicityScore?: number;
  intentType?: IntentType;
  severity?: Severity;
}): Promise<Reply[]> {
  const { comment, strategy, toxicityScore, intentType, severity } = params;

  // Demo mode
  if (isDemoMode) {
    logger.info('Demo mode: returning mock replies');
    return DEMO_REPLIES(strategy);
  }

  // ignore strategy → no replies
  if (strategy === 'ignore') {
    logger.info('Strategy is "ignore", returning empty replies');
    return [];
  }

  const userPrompt = buildReplyUserPrompt({
    comment,
    strategy,
    toxicityScore,
    intentType,
  });

  logger.info({ strategy, commentLength: comment.length }, 'Generating replies');

  // --- First attempt ---
  let raw = await callFeatherless({
    messages: [
      { role: 'system', content: REPLY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 1200,
  });

  let parsed = safeParseJSON<unknown>(raw);

  // --- Retry ---
  if (!parsed) {
    logger.warn('First reply attempt returned invalid JSON, retrying...');

    raw = await callFeatherless({
      messages: [
        { role: 'system', content: REPLY_RETRY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildReplyRetryUserPrompt(comment, strategy),
        },
      ],
      temperature: 0.5,
      maxTokens: 1200,
    });

    parsed = safeParseJSON<unknown>(raw);
  }

  if (!parsed) {
    logger.error('Reply retry also returned invalid JSON');
    throw new InvalidAIResponseError('Reply generation AI returned unparseable JSON');
  }

  // Schema validation
  const validated = repliesOutputSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error(
      { errors: validated.error.format() },
      'Reply output failed schema validation'
    );
    throw new InvalidAIResponseError('Reply output failed schema validation');
  }

  const goldParams = {
    severity: severity ?? 'low',
    intentType: intentType ?? 'neutral',
    strategy,
  };

  const replies = validateAndSanitizeReplies(
    validated.data.replies,
    strategy,
    goldParams
  );

  if (!hasMinimumReplies(replies)) {
    logger.warn(
      { count: replies.length },
      'AI generated fewer than 3 valid replies'
    );
    if (replies.length === 0) {
      throw new InvalidAIResponseError(
        'AI generated no valid replies after sanitization'
      );
    }
  }

  return replies;
}

// ============================================================
// Custom error
// ============================================================

export class InvalidAIResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAIResponseError';
  }
}
