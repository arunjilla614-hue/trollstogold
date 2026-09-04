import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { FeatherlessMessage, FeatherlessResponse } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('featherless-service');

const FEATHERLESS_BASE_URL = 'https://api.featherless.ai/v1';
const FEATHERLESS_CHAT_ENDPOINT = `${FEATHERLESS_BASE_URL}/chat/completions`;
const DEFAULT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const DEFAULT_TIMEOUT_MS = 30_000;

// -----------------------------------------------------------
// Error classes
// -----------------------------------------------------------

export class FeatherlessAuthError extends Error {
  constructor(message = 'Invalid Featherless API key') {
    super(message);
    this.name = 'FeatherlessAuthError';
  }
}

export class FeatherlessRateLimitError extends Error {
  constructor(message = 'Featherless rate limit exceeded') {
    super(message);
    this.name = 'FeatherlessRateLimitError';
  }
}

export class FeatherlessModelError extends Error {
  constructor(message = 'Model unavailable or unauthorized') {
    super(message);
    this.name = 'FeatherlessModelError';
  }
}

export class FeatherlessTimeoutError extends Error {
  constructor(message = 'Featherless request timed out') {
    super(message);
    this.name = 'FeatherlessTimeoutError';
  }
}

export class FeatherlessServiceError extends Error {
  statusCode?: number;
  constructor(message = 'Featherless service error', statusCode?: number) {
    super(message);
    this.name = 'FeatherlessServiceError';
    this.statusCode = statusCode;
  }
}

export class FeatherlessEmptyResponseError extends Error {
  constructor(message = 'Featherless returned an empty response') {
    super(message);
    this.name = 'FeatherlessEmptyResponseError';
  }
}

// -----------------------------------------------------------
// Request options
// -----------------------------------------------------------

export interface FeatherlessCallOptions {
  messages: FeatherlessMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

// -----------------------------------------------------------
// Core Featherless client function
// -----------------------------------------------------------

/**
 * Send a chat completion request to Featherless AI.
 * Returns the model's raw text response content.
 *
 * This is the ONLY function that talks to the Featherless API.
 * All other services use this function.
 */
export async function callFeatherless(
  options: FeatherlessCallOptions
): Promise<string> {
  const {
    messages,
    temperature = 0.4,
    maxTokens = 1200,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const requestBody = {
    model: env.FEATHERLESS_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  logger.info(
    {
      model: env.FEATHERLESS_MODEL,
      messageCount: messages.length,
      temperature,
      maxTokens,
    },
    'Sending request to Featherless AI'
  );

  try {
    const response = await axios.post<FeatherlessResponse>(
      FEATHERLESS_CHAT_ENDPOINT,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${env.FEATHERLESS_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      }
    );

    const choices = response.data?.choices;
    if (!choices || choices.length === 0) {
      throw new FeatherlessEmptyResponseError();
    }

    const content = choices[0]?.message?.content;
    if (!content || content.trim() === '') {
      throw new FeatherlessEmptyResponseError('Model returned empty content');
    }

    logger.info(
      {
        model: response.data.model,
        finishReason: choices[0]?.finish_reason,
        usage: response.data.usage,
      },
      'Featherless AI response received'
    );

    return content;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return handleAxiosError(err);
    }

    if (
      err instanceof FeatherlessAuthError ||
      err instanceof FeatherlessRateLimitError ||
      err instanceof FeatherlessModelError ||
      err instanceof FeatherlessTimeoutError ||
      err instanceof FeatherlessEmptyResponseError ||
      err instanceof FeatherlessServiceError
    ) {
      throw err;
    }

    throw new FeatherlessServiceError(
      `Unexpected Featherless error: ${String(err)}`
    );
  }
}

// -----------------------------------------------------------
// Axios error → typed error mapping
// -----------------------------------------------------------

function handleAxiosError(err: AxiosError): never {
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') {
    throw new FeatherlessTimeoutError();
  }

  const status = err.response?.status;

  if (status === 401) {
    throw new FeatherlessAuthError();
  }

  if (status === 403) {
    throw new FeatherlessModelError('Access to this model is unauthorized');
  }

  if (status === 429) {
    throw new FeatherlessRateLimitError();
  }

  if (status && status >= 500) {
    throw new FeatherlessServiceError(
      `Featherless provider error (${status})`,
      status
    );
  }

  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    throw new FeatherlessServiceError('Cannot reach Featherless AI service');
  }

  throw new FeatherlessServiceError(
    err.message || 'Unknown Featherless error',
    status
  );
}
