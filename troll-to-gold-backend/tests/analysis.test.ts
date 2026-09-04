/**
 * Tests: JSON utils, Gold service, sanitizer
 */

import { extractJSON, safeParseJSON, clamp, safeNumber } from '../src/utils/json.utils';
import { sanitizeReplyText, sanitizeReason } from '../src/utils/sanitizer';
import { validateGoldScore, validateAndSanitizeReplies } from '../src/services/gold.service';

// -----------------------------------------------------------
// extractJSON
// -----------------------------------------------------------

describe('extractJSON', () => {
  it('extracts JSON from plain text', () => {
    const raw = '{"score": 82, "label": "toxic"}';
    expect(extractJSON(raw)).toBe(raw);
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"score": 82}\n```';
    const result = extractJSON(raw);
    expect(result).toBe('{"score": 82}');
  });

  it('strips plain code fences', () => {
    const raw = '```\n{"score": 50}\n```';
    expect(extractJSON(raw)).toBe('{"score": 50}');
  });

  it('extracts JSON from text with preamble', () => {
    const raw = 'Here is the result: {"score": 70, "label": "mild"}. That is it.';
    const result = extractJSON(raw);
    expect(result).toBe('{"score": 70, "label": "mild"}');
  });

  it('throws when no JSON object is present', () => {
    expect(() => extractJSON('No JSON here at all')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => extractJSON('')).toThrow();
  });
});

// -----------------------------------------------------------
// safeParseJSON
// -----------------------------------------------------------

describe('safeParseJSON', () => {
  it('returns parsed object for valid JSON', () => {
    const result = safeParseJSON<{ score: number }>('{"score": 82}');
    expect(result).toEqual({ score: 82 });
  });

  it('returns null for malformed JSON', () => {
    const result = safeParseJSON('not valid json {{{');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeParseJSON('')).toBeNull();
  });

  it('parses JSON wrapped in markdown fences', () => {
    const result = safeParseJSON<{ ok: boolean }>('```json\n{"ok": true}\n```');
    expect(result).toEqual({ ok: true });
  });
});

// -----------------------------------------------------------
// clamp / safeNumber
// -----------------------------------------------------------

describe('clamp', () => {
  it('clamps value within range', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

describe('safeNumber', () => {
  it('returns clamped number for valid input', () => {
    expect(safeNumber(120, 0, 100, 50)).toBe(100);
    expect(safeNumber(75, 0, 100, 50)).toBe(75);
  });

  it('returns fallback for NaN', () => {
    expect(safeNumber('abc', 0, 100, 50)).toBe(50);
  });

  it('returns fallback for undefined', () => {
    expect(safeNumber(undefined, 0, 100, 50)).toBe(50);
  });

  it('returns fallback for null', () => {
    expect(safeNumber(null, 0, 100, 50)).toBe(50);
  });
});

// -----------------------------------------------------------
// Sanitizer
// -----------------------------------------------------------

describe('sanitizeReplyText', () => {
  it('returns the text as-is for normal input', () => {
    expect(sanitizeReplyText('Hello world')).toBe('Hello world');
  });

  it('truncates long text', () => {
    const long = 'a'.repeat(700);
    const result = sanitizeReplyText(long);
    expect(result.length).toBeLessThanOrEqual(603);
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeReplyText(null)).toBe('');
    expect(sanitizeReplyText(undefined)).toBe('');
    expect(sanitizeReplyText(42)).toBe('');
  });
});

describe('sanitizeReason', () => {
  it('returns trimmed reason', () => {
    expect(sanitizeReason('  Some reason.  ')).toBe('Some reason.');
  });

  it('returns fallback for empty input', () => {
    expect(sanitizeReason('')).toBe('No reason provided.');
    expect(sanitizeReason(null)).toBe('No reason provided.');
  });
});

// -----------------------------------------------------------
// Gold service
// -----------------------------------------------------------

describe('validateGoldScore', () => {
  const safeParams = { severity: 'low' as const, intentType: 'playful_trolling' as const, strategy: 'comedian_comeback' as const };

  it('clamps score to 0-100 range', () => {
    expect(validateGoldScore(150, safeParams)).toBe(100);
    expect(validateGoldScore(-10, safeParams)).toBe(0);
  });

  it('returns normal score for safe content', () => {
    expect(validateGoldScore(85, safeParams)).toBe(85);
  });

  it('caps score to 15 for critical severity', () => {
    const params = { severity: 'critical' as const, intentType: 'playful_trolling' as const, strategy: 'comedian_comeback' as const };
    expect(validateGoldScore(90, params)).toBe(15);
  });

  it('caps score to 10 for hate intent', () => {
    const params = { severity: 'high' as const, intentType: 'hate' as const, strategy: 'comedian_comeback' as const };
    expect(validateGoldScore(80, params)).toBe(10);
  });

  it('caps score to 5 for ignore strategy', () => {
    const params = { severity: 'low' as const, intentType: 'neutral' as const, strategy: 'ignore' as const };
    expect(validateGoldScore(90, params)).toBe(5);
  });

  it('does not cap a safe content score below its cap', () => {
    const params = { severity: 'critical' as const, intentType: 'playful_trolling' as const, strategy: 'comedian_comeback' as const };
    expect(validateGoldScore(10, params)).toBe(10); // already under cap
  });

  // BUG-5 fix: fallback should be 0 (unknown), not 50 (medium)
  it('returns 0 (not 50) for null gold score', () => {
    expect(validateGoldScore(null, safeParams)).toBe(0);
  });

  it('returns 0 for undefined gold score', () => {
    expect(validateGoldScore(undefined, safeParams)).toBe(0);
  });

  it('returns 0 for NaN gold score', () => {
    expect(validateGoldScore('not-a-number', safeParams)).toBe(0);
  });
});

describe('validateAndSanitizeReplies', () => {
  const safeParams = { severity: 'low' as const, intentType: 'playful_trolling' as const, strategy: 'comedian_comeback' as const };

  it('returns validated replies', () => {
    const raw = [
      { id: 'reply_1', text: 'Ha! Thanks for the views!', style: 'comedian_comeback', gold_potential: 85 },
      { id: 'reply_2', text: 'My bad, will do better!', style: 'comedian_comeback', gold_potential: 78 },
      { id: 'reply_3', text: 'lol appreciate the feedback.', style: 'comedian_comeback', gold_potential: 72 },
    ];
    const result = validateAndSanitizeReplies(raw, 'comedian_comeback', safeParams);
    expect(result).toHaveLength(3);
    expect(result[0].style).toBe('comedian_comeback');
    expect(result[0].gold_potential).toBe(85);
  });

  it('filters out replies with empty text', () => {
    const raw = [
      { text: '', gold_potential: 80 },
      { text: 'Valid reply', gold_potential: 75 },
      { text: '   ', gold_potential: 70 },
    ];
    const result = validateAndSanitizeReplies(raw, 'comedian_comeback', safeParams);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Valid reply');
  });

  it('limits to 5 replies max', () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({
      text: `Reply ${i + 1}`,
      gold_potential: 80,
    }));
    const result = validateAndSanitizeReplies(raw, 'comedian_comeback', safeParams);
    expect(result).toHaveLength(5);
  });

  it('returns empty array for empty input', () => {
    expect(validateAndSanitizeReplies([], 'comedian_comeback', safeParams)).toEqual([]);
  });
});

// -----------------------------------------------------------
// Prompt injection protection (BUG-17 fix)
// -----------------------------------------------------------

import { buildAnalysisUserPrompt, buildAnalysisRetryUserPrompt } from '../src/prompts/analysis.prompt';
import { buildReplyUserPrompt, buildReplyRetryUserPrompt } from '../src/prompts/reply.prompt';

describe('Prompt injection protection', () => {
  it('escapes double quotes in comment for analysis user prompt', () => {
    const prompt = buildAnalysisUserPrompt({
      comment: 'You said "garbage" but I disagree',
    });
    // Original quotes should be replaced with unicode left double quotation mark
    expect(prompt).not.toContain('"garbage"');
    expect(prompt).toContain('\u201cgarbage\u201c');
  });

  it('escapes double quotes in comment for analysis retry prompt', () => {
    const prompt = buildAnalysisRetryUserPrompt('He said "hello world"');
    expect(prompt).not.toContain('"hello world"');
    expect(prompt).toContain('\u201chello world\u201c');
  });

  it('escapes double quotes in comment for reply user prompt', () => {
    const prompt = buildReplyUserPrompt({
      comment: 'You "definitely" suck',
      strategy: 'comedian_comeback',
    });
    expect(prompt).not.toContain('"definitely"');
    expect(prompt).toContain('\u201cdefinitely\u201c');
  });

  it('escapes double quotes in comment for reply retry prompt', () => {
    const prompt = buildReplyRetryUserPrompt('He said "test"', 'sarcastic_hr');
    expect(prompt).not.toContain('"test"');
    expect(prompt).toContain('\u201ctest\u201c');
  });

  it('handles comment with no special characters unchanged', () => {
    const comment = 'Your video is garbage';
    const prompt = buildAnalysisUserPrompt({ comment });
    expect(prompt).toContain(comment);
  });
});

// -----------------------------------------------------------
// Zod coerce.number() — handles string numbers from AI (BUG-10 fix)
// -----------------------------------------------------------

describe('safeParseJSON with coerced numbers', () => {
  it('handles float toxicity score in AI output', () => {
    const raw = '{"toxicity": {"score": 72.5, "label": "toxic", "severity": "medium", "reason": "test"}, "intent": {"type": "insult", "confidence": 0.8, "reason": "test"}, "strategy": {"recommended": "comedian_comeback", "reason": "test"}}';
    const parsed = safeParseJSON(raw);
    expect(parsed).not.toBeNull();
    // The score should be parseable as a number
    const score = (parsed as { toxicity: { score: number } }).toxicity.score;
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

