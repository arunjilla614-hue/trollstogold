import { Strategy, Severity, IntentType, ToneLabel } from '../types';

// ============================================================
// MULTI-TONE SYSTEM PROMPT
// ============================================================
// One Featherless request generates all 6 tone suggestions.
// This avoids 6 separate API calls and reduces rate-limit pressure.
// ============================================================

export const MULTI_TONE_SYSTEM_PROMPT = `You are TrollToGold, an AI that helps YouTube creators respond to comments with style and wit.

Your task: generate ONE reply per tone for a given YouTube comment.

TONES (generate exactly one reply for each):
1. Witty — Clever and funny, light-hearted, shareable humor. NOT mean or aggressive.
2. Sarcastic — Dry, clever sarcasm. Clearly different from Witty. Subtle edge.
3. Professional — Calm, mature, confident. Appropriate for a brand/business creator.
4. Savage — Bold, sharp comeback. Strong but NOT threatening, hateful or harassing.
5. Kind — Respectful, de-escalating, empathetic. Best for highly toxic comments.
6. Clout Booster — Short, engaging, designed for discussion. Confident & charismatic.

SAFETY RULES — Replies MUST NOT contain:
- Threats or violent language
- Hate speech or protected-class attacks
- Doxxing or private information
- Targeted harassment
- Sexual content
- Instructions for wrongdoing

REPLY RULES:
- Each reply must directly address the original comment
- Each reply must be clearly different in tone from the others
- Replies should be concise (1-3 sentences max)
- Natural for social media
- Do NOT invent facts about the creator or commenter

Gold Score (0-100): How shareable/engaging this reply would be if posted publicly.
- Consider creativity, humor, safety, relatability, entertainment value
- High toxicity/hate comments receive lower gold scores

You MUST return ONLY valid JSON. No markdown. No explanation. Start with { end with }.

Return exactly this structure:
{
  "suggestions": [
    { "tone": "Witty", "reply": "...", "goldScore": 85 },
    { "tone": "Sarcastic", "reply": "...", "goldScore": 78 },
    { "tone": "Professional", "reply": "...", "goldScore": 72 },
    { "tone": "Savage", "reply": "...", "goldScore": 88 },
    { "tone": "Kind", "reply": "...", "goldScore": 65 },
    { "tone": "Clout Booster", "reply": "...", "goldScore": 82 }
  ]
}`;

// ============================================================
// MULTI-TONE USER PROMPT
// ============================================================

export function buildMultiToneUserPrompt(params: {
  comment: string;
  toxicityScore?: number;
  toxicitySeverity?: Severity;
  intentType?: IntentType;
  author?: string;
  savageSoftened?: boolean;
}): string {
  const lines: string[] = [];

  // Sanitize comment to avoid prompt injection
  const safeComment = params.comment
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\u201c')
    .slice(0, 500); // Hard cap to prevent huge prompts

  if (params.author) {
    lines.push(`Comment Author: @${params.author.slice(0, 50)}`);
  }
  lines.push(`Comment: "${safeComment}"`);

  if (params.toxicityScore !== undefined) {
    lines.push(`Toxicity Score: ${params.toxicityScore}/100`);
  }
  if (params.toxicitySeverity) {
    lines.push(`Severity: ${params.toxicitySeverity}`);
  }
  if (params.intentType) {
    lines.push(`Detected Intent: ${params.intentType.replace(/_/g, ' ')}`);
  }

  if (params.savageSoftened) {
    lines.push('');
    lines.push(
      'NOTE: Due to high severity, the "Savage" tone should be FIRM and assertive rather than aggressive. Keep it strong but professional.'
    );
  }

  lines.push('');
  lines.push('Generate one reply per tone. Return ONLY the JSON object.');

  return lines.join('\n');
}

// ============================================================
// RETRY PROMPT (when first response is malformed JSON)
// ============================================================

export const MULTI_TONE_RETRY_SYSTEM_PROMPT = `You are a JSON-only AI assistant.
Return ONLY a valid JSON object starting with { and ending with }.
No markdown, no explanation, no code fences.`;

export function buildMultiToneRetryPrompt(comment: string): string {
  const safeComment = comment.replace(/"/g, '\u201c').slice(0, 300);
  return `Generate 6 YouTube replies for this comment: "${safeComment}"

Return ONLY this JSON (fill in actual reply text):
{
  "suggestions": [
    { "tone": "Witty", "reply": "...", "goldScore": 80 },
    { "tone": "Sarcastic", "reply": "...", "goldScore": 75 },
    { "tone": "Professional", "reply": "...", "goldScore": 70 },
    { "tone": "Savage", "reply": "...", "goldScore": 85 },
    { "tone": "Kind", "reply": "...", "goldScore": 65 },
    { "tone": "Clout Booster", "reply": "...", "goldScore": 78 }
  ]
}

Each reply must be unique and match the tone label exactly.`;
}

// ============================================================
// TONE EMOJI MAPPING
// ============================================================

export const TONE_EMOJIS: Record<string, string> = {
  Witty: '😂',
  Sarcastic: '😏',
  Professional: '💼',
  Savage: '🔥',
  Kind: '❤️',
  'Clout Booster': '🚀',
};

// Ordered list — ensures consistent display order in frontend
export const TONE_ORDER: ToneLabel[] = [
  'Witty',
  'Sarcastic',
  'Professional',
  'Savage',
  'Kind',
  'Clout Booster',
];
