/**
 * YapShield Gateway Error Taxonomy
 *
 * Provides a standardized, machine-readable error taxonomy and user-safe messages.
 * Never leaks raw prompt text, credentials, internal paths, or unvetted error messages.
 */

import { GatewayStage } from './logger';
import { getErrorStatus, isNetworkTimeout } from './gemini';

export type GatewayErrorCode =
  | 'llm_busy'
  | 'llm_timeout'
  | 'llm_config'
  | 'storage_error'
  | 'internal';

export const GATEWAY_ERROR_MESSAGES: Record<GatewayErrorCode, string> = {
  llm_busy:
    'The AI service is busy right now. Your prompt was not sent. Please try again in a minute.',
  llm_timeout:
    'The AI service took too long to answer. Your prompt was not sent.',
  llm_config:
    'The AI model is not available. Please tell the administrator.',
  storage_error:
    'A storage step failed. Your prompt was not sent.',
  internal:
    'Something went wrong. Your prompt was not sent.',
};

export interface ClassifiedGatewayError {
  code: GatewayErrorCode;
  reason: GatewayErrorCode;
  message: string;
}

/**
 * Classifies any gateway or downstream error into the machine-readable error taxonomy.
 * Returns user-safe messages and codes.
 */
export function classifyGatewayError(
  error: unknown,
  stage?: GatewayStage
): ClassifiedGatewayError {
  // 1. Storage errors: vault or audit failures
  if (stage === 'vault' || stage === 'audit') {
    return {
      code: 'storage_error',
      reason: 'storage_error',
      message: GATEWAY_ERROR_MESSAGES.storage_error,
    };
  }

  if (stage !== 'llm' && stage !== 'validate' && error instanceof Error) {
    const lowerMsg = error.message.toLowerCase();
    if (
      lowerMsg.includes('vaultstore') ||
      lowerMsg.includes('auditstore') ||
      lowerMsg.includes('vault store') ||
      error.name === 'VaultError' ||
      error.name === 'AuditStoreError'
    ) {
      return {
        code: 'storage_error',
        reason: 'storage_error',
        message: GATEWAY_ERROR_MESSAGES.storage_error,
      };
    }
  }

  // 2. Timeouts / Aborts
  if (
    isNetworkTimeout(error) ||
    (error instanceof Error &&
      (error.name === 'TimeoutError' ||
        error.name === 'AbortError' ||
        error.name === 'GoogleGenerativeAIAbortError' ||
        error.message.toLowerCase().includes('deadline') ||
        error.message.toLowerCase().includes('timed out') ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('took too long') ||
        error.message.toLowerCase().includes('aborted')))
  ) {
    return {
      code: 'llm_timeout',
      reason: 'llm_timeout',
      message: GATEWAY_ERROR_MESSAGES.llm_timeout,
    };
  }

  // 3. HTTP status codes from LLM or other downstream services
  const status = getErrorStatus(error);

  if (status === 503 || status === 429) {
    return {
      code: 'llm_busy',
      reason: 'llm_busy',
      message: GATEWAY_ERROR_MESSAGES.llm_busy,
    };
  }

  if (status === 404 || status === 401 || status === 403) {
    return {
      code: 'llm_config',
      reason: 'llm_config',
      message: GATEWAY_ERROR_MESSAGES.llm_config,
    };
  }

  // Check error message text for config or busy indicators
  if (error instanceof Error) {
    const msg = error.message;
    const lower = msg.toLowerCase();

    if (
      lower.includes('503') ||
      lower.includes('429') ||
      lower.includes('busy') ||
      lower.includes('overloaded') ||
      lower.includes('rate limit')
    ) {
      return {
        code: 'llm_busy',
        reason: 'llm_busy',
        message: GATEWAY_ERROR_MESSAGES.llm_busy,
      };
    }

    if (
      lower.includes('404') ||
      lower.includes('401') ||
      lower.includes('403') ||
      lower.includes('api_key') ||
      lower.includes('apikey') ||
      /AIza[0-9A-Za-z\-_]{35}/.test(msg) ||
      lower.includes('not found') ||
      lower.includes('model is not available') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden')
    ) {
      return {
        code: 'llm_config',
        reason: 'llm_config',
        message: GATEWAY_ERROR_MESSAGES.llm_config,
      };
    }
  }

  // 4. Fallback to generic internal error
  return {
    code: 'internal',
    reason: 'internal',
    message: GATEWAY_ERROR_MESSAGES.internal,
  };
}
