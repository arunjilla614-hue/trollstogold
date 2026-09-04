/**
 * Utility to extract a clean JSON object from an AI model's response text.
 * Models sometimes wrap JSON in markdown code fences or add preamble text.
 */

/**
 * Strip markdown code fences and extract the first JSON object from a string.
 */
export function extractJSON(raw: string): string {
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find the first { and the last matching }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in model response');
  }

  return cleaned.slice(start, end + 1);
}

/**
 * Attempt to parse JSON from an AI response string.
 * Returns null if parsing fails rather than throwing.
 */
export function safeParseJSON<T = unknown>(raw: string): T | null {
  try {
    const jsonStr = extractJSON(raw);
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Clamp a number to a given range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ensure a value is a finite number in range, returning a fallback otherwise.
 */
export function safeNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!isFinite(n)) return fallback;
  return clamp(n, min, max);
}
