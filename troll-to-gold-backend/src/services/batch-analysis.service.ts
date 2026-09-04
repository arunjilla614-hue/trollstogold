import { analyzeComment } from './analysis.service';
import { YouTubeComment, AnalysisResult } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('batch-analysis-service');

// ============================================================
// Batch Analysis Service
// ============================================================
// Analyzes large sets of YouTube comments with controlled batching
// and concurrency to avoid overwhelming Featherless AI.
//
// Configuration:
//   BATCH_SIZE       — comments per batch (default 10)
//   MAX_CONCURRENCY  — parallel AI calls at once (default 5)
// ============================================================

const BATCH_SIZE = 10;
const MAX_CONCURRENCY = 2; // Keep low to avoid Featherless rate limits on free plans
const REQUEST_DELAY_MS = 300; // Small delay between concurrent requests

export interface AnalyzedComment {
  comment: YouTubeComment;
  analysis: AnalysisResult | null;
  error?: string;
}

export interface BatchAnalysisResult {
  total: number;
  succeeded: number;
  failed: number;
  results: AnalyzedComment[];
}

/**
 * Analyze an array of YouTube comments in controlled batches.
 * Each comment is individually analyzed via Featherless AI.
 * Failures are caught per-comment and do not abort the whole batch.
 */
export async function analyzeCommentsBatch(
  comments: YouTubeComment[],
  videoTitle?: string
): Promise<BatchAnalysisResult> {
  const total = comments.length;
  const results: AnalyzedComment[] = [];
  let succeeded = 0;
  let failed = 0;

  logger.info(
    { total, batchSize: BATCH_SIZE, concurrency: MAX_CONCURRENCY },
    'Starting batch analysis'
  );

  // Split into batches
  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batch = comments.slice(batchStart, batchStart + BATCH_SIZE);

    logger.info(
      {
        batchStart,
        batchEnd: batchStart + batch.length,
        total,
      },
      'Processing batch'
    );

    // Process batch with concurrency control
    const batchResults = await processWithConcurrency(
      batch,
        async (comment) => {
        let lastError: Error | null = null;
        // Retry up to 3 times with exponential backoff for rate limits
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const analysis = await analyzeComment({
              comment: comment.text,
              author: comment.author,
              videoTitle,
            });
            return { comment, analysis };
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            const isRateLimit =
              lastError.message.toLowerCase().includes('rate limit') ||
              lastError.message.toLowerCase().includes('429');
            if (isRateLimit && attempt < 3) {
              const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
              logger.warn(
                { commentId: comment.id, attempt, delay },
                'Rate limited — retrying after delay'
              );
              await new Promise((r) => setTimeout(r, delay));
            } else {
              break;
            }
          }
        }
        const errorMessage = lastError?.message ?? 'Unknown error';
        logger.warn(
          { commentId: comment.id, error: errorMessage },
          'Failed to analyze comment'
        );
        return {
          comment,
          analysis: null,
          error: 'Analysis failed',
        };
      },
      MAX_CONCURRENCY,
      REQUEST_DELAY_MS
    );

    for (const result of batchResults) {
      results.push(result);
      if (result.analysis !== null) {
        succeeded++;
      } else {
        failed++;
      }
    }
  }

  logger.info({ total, succeeded, failed }, 'Batch analysis complete');

  return {
    total,
    succeeded,
    failed,
    results,
  };
}

/**
 * Process an array of items with a maximum concurrency limit.
 * Avoids firing all requests simultaneously.
 */
async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  delayMs = 0
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  let index = 0;

  const runNext = async (): Promise<void> => {
    const i = index++;
    if (i >= items.length) return;
    if (delayMs > 0 && i > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    results[i] = await fn(items[i]);
  };

  // Initialize up to `concurrency` concurrent tasks
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    const task = runNext().then(async () => {
      // When one finishes, start the next
      while (index < items.length) {
        await runNext();
      }
    });
    executing.push(task);
  }

  await Promise.all(executing);
  return results;
}
