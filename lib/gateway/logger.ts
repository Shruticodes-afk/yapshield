/**
 * YapShield Gateway Logger
 *
 * Implements server-side error logging for the fail-closed gateway pipeline.
 * Ensures zero leakage of:
 * - raw prompts
 * - sanitized prompts
 * - token values ([PHONE_1], [REDACTED_...])
 * - request body
 * - environment variables (VAULT_SECRET, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)
 * - API keys and secrets
 */

export type GatewayStage =
  | 'validate'
  | 'detect'
  | 'policy'
  | 'vault'
  | 'llm'
  | 'audit'
  | 'restore';

export interface SensitiveLogContext {
  prompt?: string;
  sanitized?: string;
  body?: string;
}

/**
 * Checks whether an error or its message could potentially contain
 * sensitive information (prompts, tokens, request body, env vars, API keys).
 */
export function isPotentiallySensitive(
  error: unknown,
  stage: GatewayStage,
  context?: SensitiveLogContext
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message || '';

  // 1. In 'validate' stage: SyntaxError from JSON.parse embeds raw request body excerpts
  if (
    stage === 'validate' &&
    (error instanceof SyntaxError ||
      /JSON|SyntaxError|Unexpected token|position/i.test(message))
  ) {
    return true;
  }

  // 2. Check if context prompt / sanitized / body is reflected in error message
  if (context?.prompt) {
    const prompt = context.prompt.trim();
    if (prompt.length > 0 && message.includes(prompt)) {
      return true;
    }
    if (prompt.length >= 10) {
      for (let i = 0; i <= prompt.length - 10; i += 10) {
        if (message.includes(prompt.slice(i, i + 10))) {
          return true;
        }
      }
    }
  }

  if (context?.sanitized) {
    const sanitized = context.sanitized.trim();
    if (sanitized.length > 0 && message.includes(sanitized)) {
      return true;
    }
    if (sanitized.length >= 10) {
      for (let i = 0; i <= sanitized.length - 10; i += 10) {
        if (message.includes(sanitized.slice(i, i + 10))) {
          return true;
        }
      }
    }
  }

  if (context?.body) {
    const body = context.body.trim();
    if (body.length > 0 && message.includes(body)) {
      return true;
    }
  }

  // 3. Check for token patterns: [PHONE_1], [EMAIL_1], [REDACTED_...], [BLOCKED_...]
  if (
    /\[[A-Z_]+_\d+\]/.test(message) ||
    /\[(?:REDACTED|BLOCKED)_[A-Z_]+\]/.test(message)
  ) {
    return true;
  }

  // 4. Check for sensitive environment variable names
  const envVarNames = [
    'VAULT_SECRET',
    'GEMINI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'DASHBOARD_PASSCODE',
    'SUPABASE_ANON_KEY',
    'SERVICE_ROLE_KEY',
  ];
  for (const name of envVarNames) {
    if (message.includes(name)) {
      return true;
    }
  }

  // 5. Check for sensitive environment variable values (if present in process.env)
  for (const name of envVarNames) {
    const val = process.env[name];
    if (val && val.length > 3 && message.includes(val)) {
      return true;
    }
  }

  // 6. Check for common API key and secret formats
  if (
    /sk-[a-zA-Z0-9_\-]{16,}/i.test(message) ||
    /AIza[0-9A-Za-z\-_]{35}/.test(message) ||
    /bearer\s+[a-zA-Z0-9._\-]+/i.test(message) ||
    /ey[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]{15,}/.test(message) ||
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/.test(message) ||
    /(?:api[-_]?key|secret|token|password)\s*[:=]/i.test(message) ||
    /key=[a-zA-Z0-9_\-]{10,}/i.test(message) ||
    /[0-9a-fA-F]{32,}/.test(message)
  ) {
    return true;
  }

  // 7. Check for JSON / request body property leaks
  if (
    /"prompt"\s*:/i.test(message) ||
    /"overrides"\s*:/i.test(message) ||
    /"encrypted_value"/i.test(message) ||
    /prompt\s*=/i.test(message)
  ) {
    return true;
  }

  return false;
}

/**
 * Logs gateway errors to server console with fail-closed privacy guarantees:
 * - If the error could leak sensitive data (prompt, token, body, env vars, keys),
 *   logs ONLY error.name and the stage.
 * - Otherwise logs error.name + ': ' + error.message and the stage.
 */
export function logGatewayError(
  stage: GatewayStage,
  error: unknown,
  context?: SensitiveLogContext
): void {
  const isSensitive = isPotentiallySensitive(error, stage, context);

  if (isSensitive) {
    console.error(
      '[gateway]',
      stage,
      error instanceof Error ? error.name : 'unknown error'
    );
  } else {
    console.error(
      '[gateway]',
      stage,
      error instanceof Error
        ? error.name + ': ' + error.message
        : 'unknown error'
    );
  }
}
