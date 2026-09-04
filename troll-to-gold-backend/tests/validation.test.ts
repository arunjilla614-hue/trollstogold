/**
 * Tests: Featherless service error handling (mocked axios)
 */

import axios from 'axios';

// Mock axios before importing the service
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Set env vars before service imports
process.env['NODE_ENV'] = 'test';
process.env['DEMO_MODE'] = 'false';
process.env['FEATHERLESS_API_KEY'] = 'test_featherless_key';
process.env['FEATHERLESS_MODEL'] = 'test-model';
process.env['YOUTUBE_API_KEY'] = 'test_yt_key';
process.env['FRONTEND_URL'] = 'http://localhost:3000';

import {
  callFeatherless,
  FeatherlessAuthError,
  FeatherlessRateLimitError,
  FeatherlessTimeoutError,
  FeatherlessServiceError,
  FeatherlessEmptyResponseError,
} from '../src/services/featherless.service';

// Helper to build a mock Featherless response
function buildMockResponse(content: string) {
  return {
    data: {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      model: 'test-model',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  };
}

// Helper to create a mock axios error (bypasses type predicate issues)
function mockAxiosError(status?: number, code?: string) {
  const err = Object.assign(new Error('Axios error'), {
    isAxiosError: true,
    response: status ? { status, data: { error: { errors: [] } } } : undefined,
    code,
  });
  return err;
}

describe('callFeatherless', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use spyOn so we don't violate the type predicate constraint
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
  });

  it('returns model content on success', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildMockResponse('{"score": 75}'));

    const result = await callFeatherless({
      messages: [{ role: 'user', content: 'Analyze this comment' }],
    });

    expect(result).toBe('{"score": 75}');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('throws FeatherlessAuthError on 401', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockedAxios.post.mockRejectedValueOnce(mockAxiosError(401));

    await expect(
      callFeatherless({ messages: [{ role: 'user', content: 'test' }] })
    ).rejects.toThrow(FeatherlessAuthError);
  });

  it('throws FeatherlessRateLimitError on 429', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockedAxios.post.mockRejectedValueOnce(mockAxiosError(429));

    await expect(
      callFeatherless({ messages: [{ role: 'user', content: 'test' }] })
    ).rejects.toThrow(FeatherlessRateLimitError);
  });

  it('throws FeatherlessServiceError on 500', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockedAxios.post.mockRejectedValueOnce(mockAxiosError(500));

    await expect(
      callFeatherless({ messages: [{ role: 'user', content: 'test' }] })
    ).rejects.toThrow(FeatherlessServiceError);
  });

  it('throws FeatherlessTimeoutError on ECONNABORTED', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockedAxios.post.mockRejectedValueOnce(mockAxiosError(undefined, 'ECONNABORTED'));

    await expect(
      callFeatherless({ messages: [{ role: 'user', content: 'test' }] })
    ).rejects.toThrow(FeatherlessTimeoutError);
  });

  it('throws FeatherlessEmptyResponseError on empty choices', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { id: 'test', choices: [], model: 'test-model' },
      status: 200,
    });

    await expect(
      callFeatherless({ messages: [{ role: 'user', content: 'test' }] })
    ).rejects.toThrow(FeatherlessEmptyResponseError);
  });

  it('throws FeatherlessEmptyResponseError on empty content', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildMockResponse(''));

    await expect(
      callFeatherless({ messages: [{ role: 'user', content: 'test' }] })
    ).rejects.toThrow(FeatherlessEmptyResponseError);
  });

  it('sends request with correct headers and body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildMockResponse('{"ok": true}'));

    await callFeatherless({
      messages: [{ role: 'system', content: 'You are helpful' }],
      temperature: 0.3,
      maxTokens: 500,
    });

    const callArgs = mockedAxios.post.mock.calls[0];
    const url = callArgs[0] as string;
    const body = callArgs[1] as Record<string, unknown>;
    const config = callArgs[2] as { headers: Record<string, string> };

    expect(url).toBe('https://api.featherless.ai/v1/chat/completions');
    expect(body['temperature']).toBe(0.3);
    expect(body['max_tokens']).toBe(500);
    // Verify API key is in Authorization header (not in response body)
    expect(config.headers['Authorization']).toMatch(/^Bearer /);
    expect(JSON.stringify(body)).not.toContain('test_featherless_key');
  });
});
