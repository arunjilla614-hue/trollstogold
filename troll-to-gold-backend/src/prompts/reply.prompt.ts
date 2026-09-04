import { Strategy } from '../types';

// ============================================================
// SYSTEM PROMPT — Reply Generation
// ============================================================

export const REPLY_SYSTEM_PROMPT = `You are TrollToGold, an AI assistant helping content creators generate creative, safe, and engaging responses to YouTube comments.

Your job is to generate 3-5 distinct reply options for the given comment, all matching the requested style.

SAFETY RULES — Replies MUST NOT contain:
- Threats or violent language
- Hateful attacks on any group
- Doxxing or private information
- Targeted harassment
- Attacks based on protected characteristics (race, religion, gender, etc.)
- Encouragement of harassment

STYLE GUIDES:
- comedian_comeback: Witty, funny, self-aware. Uses humor to deflect without being mean. Light-hearted.
- shakespearean_roast: Dramatic, flowery, Shakespearean language. Grand insults with old English flair.
- sarcastic_hr: Corporate HR tone mixed with barely-concealed sarcasm. Professional on the surface, savage underneath.
- clout_booster: Turns the comment into an opportunity to showcase personality and win fans. Confident, charismatic.
- kind_redirect: Empathetic, constructive. Addresses the concern respectfully and redirects positively.
- ignore: Return an empty replies array — this comment should not be engaged with.

Gold Potential (0-100) represents how shareable/engaging the reply could be if posted publicly.
Consider: creativity, humor, relevance, entertainment value, safety, relatability.
Gold ≠ Toxicity. A toxic comment can have high Gold if it produces a brilliant reply.

You MUST return ONLY a valid JSON object. No markdown. No explanation outside the JSON.

Return this exact structure:
{
  "replies": [
    {
      "id": "reply_1",
      "text": "<the reply text>",
      "style": "<strategy name>",
      "gold_potential": <integer 0-100>
    },
    {
      "id": "reply_2",
      "text": "<the reply text>",
      "style": "<strategy name>",
      "gold_potential": <integer 0-100>
    },
    {
      "id": "reply_3",
      "text": "<the reply text>",
      "style": "<strategy name>",
      "gold_potential": <integer 0-100>
    }
  ]
}`;

// ============================================================
// USER PROMPT — Reply Generation
// ============================================================

export function buildReplyUserPrompt(params: {
  comment: string;
  strategy: Strategy;
  toxicityScore?: number;
  intentType?: string;
}): string {
  const lines: string[] = [];

  // Escape quotes to prevent prompt structure corruption
  const safeComment = params.comment.replace(/"/g, '\u201c').replace(/\\/g, '\\\\');

  lines.push(`Comment: "${safeComment}"`);
  lines.push(`Required Style: ${params.strategy}`);

  if (params.toxicityScore !== undefined) {
    lines.push(`Toxicity Score: ${params.toxicityScore}/100`);
  }
  if (params.intentType) {
    lines.push(`Detected Intent: ${params.intentType}`);
  }

  lines.push('');
  lines.push(
    'Generate 3-5 reply options in the required style. Return ONLY the JSON object.'
  );

  return lines.join('\n');
}

// ============================================================
// RETRY PROMPT — Reply Generation
// ============================================================

export const REPLY_RETRY_SYSTEM_PROMPT = `You are a JSON-only AI assistant.
Return ONLY a valid JSON object starting with { and ending with }.
No markdown, no explanation, no code fences.`;

export function buildReplyRetryUserPrompt(
  comment: string,
  strategy: Strategy
): string {
  const safeComment = comment.replace(/"/g, '\u201c').replace(/\\/g, '\\\\');
  return `Generate 3 YouTube reply options in the style: ${strategy}

Comment: "${safeComment}"

Return ONLY this JSON:
{
  "replies": [
    { "id": "reply_1", "text": "...", "style": "${strategy}", "gold_potential": 75 },
    { "id": "reply_2", "text": "...", "style": "${strategy}", "gold_potential": 70 },
    { "id": "reply_3", "text": "...", "style": "${strategy}", "gold_potential": 65 }
  ]
}

Fill in actual reply text. Return ONLY the JSON object.`;
}
