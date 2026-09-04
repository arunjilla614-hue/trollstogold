/**
 * Sanitization utilities for AI-generated reply text.
 * Strips dangerous control characters and enforces safe lengths.
 */

const MAX_REPLY_LENGTH = 600;
const MAX_REASON_LENGTH = 300;

/**
 * Remove control characters (except newline/tab) and trim.
 */
function stripControlChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Sanitize a reply text produced by the AI model.
 */
export function sanitizeReplyText(text: unknown): string {
  if (typeof text !== 'string' || !text.trim()) {
    return '';
  }
  const cleaned = stripControlChars(text);
  return cleaned.length > MAX_REPLY_LENGTH
    ? cleaned.slice(0, MAX_REPLY_LENGTH) + '…'
    : cleaned;
}

/**
 * Sanitize a short reason/explanation string from the AI.
 */
export function sanitizeReason(text: unknown): string {
  if (typeof text !== 'string' || !text.trim()) {
    return 'No reason provided.';
  }
  const cleaned = stripControlChars(text);
  return cleaned.length > MAX_REASON_LENGTH
    ? cleaned.slice(0, MAX_REASON_LENGTH) + '…'
    : cleaned;
}
