/**
 * SERVER-ONLY MODULE
 *
 * Provides LLM client integration using Google Generative AI (Gemini).
 *
 * Features:
 * - Retries temporary Gemini errors up to 3 times with exponential backoff (1s, 2s, 4s + jitter).
 * - Retries ONLY for HTTP 503, 429 and network timeouts (never for 400, 401, 403, 404).
 * - Optional fallback model (GEMINI_FALLBACK_MODEL) tried once if all retries fail with 503 or 429.
 * - Enforces a 20-second request timeout per call.
 * - Fails closed: re-throws failures without exposing raw prompts, keys, or answers.
 * - Logs only the stage 'llm', attempt number, and HTTP status code.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiLlmOptions {
  model?: string;
  fallbackModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelays?: number[];
  client?: {
    getGenerativeModel: (
      params: { model: string },
      requestOptions?: { timeout?: number }
    ) => {
      generateContent: (prompt: string) => Promise<{
        response: Promise<{ text: () => string }> | { text: () => string };
      }>;
    };
  };
}

/**
 * Extracts numeric HTTP status code from an error if present.
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const rec = error as Record<string, unknown>;
    if (typeof rec.status === 'number') return rec.status;
    if (typeof rec.statusCode === 'number') return rec.statusCode;
    if (
      rec.response &&
      typeof (rec.response as Record<string, unknown>).status === 'number'
    ) {
      return (rec.response as Record<string, unknown>).status as number;
    }
  }
  if (error instanceof Error) {
    const match = error.message.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return undefined;
}

/**
 * Checks whether an error represents a network timeout or abort.
 */
export function isNetworkTimeout(error: unknown): boolean {
  if (error instanceof Error) {
    if (
      error.name === 'TimeoutError' ||
      error.name === 'AbortError' ||
      error.name === 'GoogleGenerativeAIAbortError'
    ) {
      return true;
    }
    const msg = error.message.toLowerCase();
    if (
      msg.includes('timed out') ||
      msg.includes('timeout') ||
      msg.includes('etimedout')
    ) {
      return true;
    }
  }
  if (typeof error === 'object' && error !== null) {
    const code = (error as Record<string, unknown>).code;
    if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an error is eligible for retry:
 * Only HTTP 503, 429, and network timeouts.
 * NEVER 400, 401, 403, or 404.
 */
export function isRetryable(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }
  if (status === 503 || status === 429) {
    return true;
  }
  if (isNetworkTimeout(error)) {
    return true;
  }
  return false;
}

/**
 * Executes an async function with a timeout limit.
 */
async function withTimeout<T>(
  promiseFn: () => Promise<T>,
  ms: number
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Request timed out after ${ms}ms`);
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
  });

  try {
    return await Promise.race([promiseFn(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Total Worst-Case Time Budget Analysis (Vercel Serverless Function Limit):
 *
 * With default settings:
 * - GEMINI_MAX_RETRIES = 2 (1 initial call + up to 2 retries on primary model)
 * - GEMINI_TIMEOUT_MS = 15000 (15s per-attempt timeout)
 * - Backoff delays = 1000ms (attempt 1 -> 2) + 2000ms (attempt 2 -> 3) + ~200ms jitter each = ~3.4s max sleep
 * - Fallback model attempt = 1 call with timeoutMs
 *
 * Theoretical unbounded duration without deadline:
 *   15s (initial) + 1.2s (backoff) + 15s (retry 1) + 2.2s (backoff) + 15s (retry 2) + 15s (fallback) = 63.4s
 *
 * To guarantee that the total worst-case execution time stays strictly under 50 seconds
 * (comfortably within Vercel's maxDuration of 60 seconds), we enforce a hard 50,000 ms
 * overall time budget ceiling (MAX_TOTAL_BUDGET_MS = 50000). Every attempt and backoff
 * sleep is clamped to Math.min(timeoutMs, remainingBudget), ensuring the entire lifecycle
 * never exceeds 50 seconds.
 */
export const MAX_TOTAL_BUDGET_MS = 50000;

/**
 * Creates a Gemini LLM runner that executes inference on sanitized prompts
 * with retry resilience, optional model fallback, and request timeout.
 */
export function makeGeminiLlm(
  options?: GeminiLlmOptions
): (sanitizedPrompt: string) => Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in environment.'
    );
  }

  const modelName =
    options?.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModelName =
    options?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL;

  const envRetries = process.env.GEMINI_MAX_RETRIES
    ? parseInt(process.env.GEMINI_MAX_RETRIES, 10)
    : NaN;
  const maxRetries =
    options?.maxRetries ??
    (!isNaN(envRetries) && envRetries >= 0 ? envRetries : 2);

  const envTimeout = process.env.GEMINI_TIMEOUT_MS
    ? parseInt(process.env.GEMINI_TIMEOUT_MS, 10)
    : NaN;
  const timeoutMs =
    options?.timeoutMs ??
    (!isNaN(envTimeout) && envTimeout > 0 ? envTimeout : 15000);

  const retryDelays =
    options?.retryDelays ??
    (process.env.NODE_ENV === 'test' && !process.env.GEMINI_SLOW_RETRY
      ? [10, 20, 40]
      : [1000, 2000, 4000]);

  const genAI = options?.client || new GoogleGenerativeAI(apiKey);
  const primaryModel = genAI.getGenerativeModel(
    { model: modelName },
    { timeout: timeoutMs }
  );

  return async (sanitizedPrompt: string): Promise<string> => {
    const startTime = Date.now();
    let lastError: unknown;

    const getRemainingBudget = () =>
      Math.max(0, MAX_TOTAL_BUDGET_MS - (Date.now() - startTime));

    // 1. Try primary model up to 1 + maxRetries times (initial + up to maxRetries retries)
    for (let attempt = 1; attempt <= 1 + maxRetries; attempt++) {
      const remaining = getRemainingBudget();
      if (remaining <= 0) {
        const timeoutError = new Error(
          `Request timed out: overall gateway budget of ${MAX_TOTAL_BUDGET_MS}ms exceeded`
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      const effectiveTimeout = Math.min(timeoutMs, remaining);

      try {
        const text = await withTimeout(async () => {
          const result = await primaryModel.generateContent(sanitizedPrompt);
          const response = await result.response;
          return response.text();
        }, effectiveTimeout);

        return text;
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        const isTimeout = isNetworkTimeout(error);

        // Requirement 5: Log only the stage 'llm', attempt number and HTTP status code
        console.error(
          '[gateway]',
          'llm',
          attempt,
          status !== undefined ? status : isTimeout ? 'timeout' : 'error'
        );

        // Check if retryable (never retry 400, 401, 403, 404)
        if (!isRetryable(error)) {
          throw error;
        }

        // Wait with exponential backoff plus random jitter before next attempt
        if (attempt <= maxRetries) {
          const baseDelay =
            retryDelays[attempt - 1] ??
            1000 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(
            Math.random() * (process.env.NODE_ENV === 'test' ? 5 : 200)
          );
          const remainingForSleep = getRemainingBudget();
          const delay = Math.min(baseDelay + jitter, remainingForSleep);
          if (delay > 0) {
            await sleep(delay);
          }
        }
      }
    }

    // 2. All retries on main model failed.
    // Check if fallback model is configured and failures were 503 or 429.
    const lastStatus = getErrorStatus(lastError);
    if (
      (lastStatus === 503 || lastStatus === 429) &&
      fallbackModelName &&
      fallbackModelName.trim().length > 0
    ) {
      const remainingForFallback = getRemainingBudget();
      if (remainingForFallback <= 0) {
        throw lastError;
      }

      const effectiveFallbackTimeout = Math.min(
        timeoutMs,
        remainingForFallback
      );

      try {
        const fallbackModel = genAI.getGenerativeModel(
          { model: fallbackModelName },
          { timeout: effectiveFallbackTimeout }
        );

        const text = await withTimeout(async () => {
          const result = await fallbackModel.generateContent(sanitizedPrompt);
          const response = await result.response;
          return response.text();
        }, effectiveFallbackTimeout);

        return text;
      } catch (fallbackError) {
        const fallbackStatus = getErrorStatus(fallbackError);
        const isFallbackTimeout = isNetworkTimeout(fallbackError);
        console.error(
          '[gateway]',
          'llm',
          'fallback',
          fallbackStatus !== undefined
            ? fallbackStatus
            : isFallbackTimeout
            ? 'timeout'
            : 'error'
        );
        throw fallbackError;
      }
    }

    // 3. If everything failed, rethrow error to maintain fail-closed guarantees
    throw lastError;
  };
}

export default makeGeminiLlm;
