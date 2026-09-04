import { v4 as uuidv4 } from 'uuid';
import { HistoryEntry, Strategy } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('history-service');

// In-memory store (stretch goal — replace with DB for production)
const historyStore: HistoryEntry[] = [];
const MAX_HISTORY_SIZE = 500;

/**
 * Add an entry to the history store.
 */
export function addHistoryEntry(params: {
  comment: string;
  strategy: Strategy;
  toxicityScore: number;
  goldScore: number;
  selectedReply?: string;
}): HistoryEntry {
  const entry: HistoryEntry = {
    id: uuidv4(),
    comment: params.comment,
    strategy: params.strategy,
    toxicityScore: params.toxicityScore,
    goldScore: params.goldScore,
    selectedReply: params.selectedReply,
    createdAt: new Date().toISOString(),
  };

  historyStore.unshift(entry); // newest first

  // Keep store bounded
  if (historyStore.length > MAX_HISTORY_SIZE) {
    historyStore.splice(MAX_HISTORY_SIZE);
    logger.debug('History store trimmed to max size');
  }

  logger.debug({ entryId: entry.id }, 'History entry added');
  return entry;
}

/**
 * Get all history entries (newest first).
 */
export function getHistory(limit = 50, offset = 0): HistoryEntry[] {
  return historyStore.slice(offset, offset + limit);
}

/**
 * Get a single history entry by ID.
 */
export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return historyStore.find((e) => e.id === id);
}

/**
 * Clear all history (useful for testing).
 */
export function clearHistory(): void {
  historyStore.splice(0, historyStore.length);
}
