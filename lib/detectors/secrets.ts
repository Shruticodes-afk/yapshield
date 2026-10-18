/**
 * YapShield - Secrets & Keys Detectors
 *
 * Implements detectors for:
 * 1. API Keys (Google, OpenAI, GitHub, AWS, Slack)
 * 2. JSON Web Tokens (JWT)
 * 3. Private Keys (PEM blocks)
 * 4. High-Entropy Secrets & Key-Value Assignments
 */

import { Detection } from './types';
import { findAll } from './utils';

// ============================================================================
// 1. API Key Detector
// ============================================================================

/**
 * Regex patterns for well-known API keys and provider tokens:
 * - Google API Key: AIza followed by 35 [0-9A-Za-z_-] chars
 * - OpenAI style keys: sk- followed by 20+ chars
 * - GitHub tokens: ghp_, gho_, github_pat_ prefixes
 * - AWS Access Key ID: AKIA followed by 16 uppercase alphanumerics
 * - Slack tokens: xox[bap]- followed by alphanumerics/hyphens
 */
const API_KEY_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bsk-[0-9A-Za-z_-]{20,}\b/g,
  /\b(?:ghp_|gho_|github_pat_)[0-9A-Za-z_]{20,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /\bxox[bap]-[0-9A-Za-z-]{10,}\b/g,
];

/**
 * Detects known API keys and tokens in text.
 */
export function detectApiKeys(text: string): Detection[] {
  if (!text) return [];

  const detections: Detection[] = [];
  for (const pattern of API_KEY_PATTERNS) {
    const matches = findAll(text, pattern, 'api_key', 0.95);
    detections.push(...matches);
  }

  // Deduplicate overlapping matches
  detections.sort((a, b) => a.start - b.start);
  const accepted: Detection[] = [];
  for (const item of detections) {
    const overlaps = accepted.some(
      (acc) => Math.max(acc.start, item.start) < Math.min(acc.end, item.end)
    );
    if (!overlaps) {
      accepted.push(item);
    }
  }

  return accepted;
}

// ============================================================================
// 2. JWT Detector
// ============================================================================

/**
 * Three base64url segments separated by dots, starting with 'eyJ'.
 * Format: eyJ<header>.<payload>.<signature>
 * Must be strictly 3 segments (not preceded or followed by additional dots or word chars).
 */
const JWT_REGEX = /(?<![A-Za-z0-9_.-])eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?![A-Za-z0-9_.-])/g;

/**
 * Detects JSON Web Tokens (JWT) in text.
 */
export function detectJwt(text: string): Detection[] {
  if (!text) return [];
  return findAll(text, JWT_REGEX, 'jwt', 0.95);
}

// ============================================================================
// 3. Private Key Detector
// ============================================================================

/**
 * Matches PEM-formatted private key blocks between BEGIN and END markers.
 * Examples:
 * -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----
 * -----BEGIN RSA PRIVATE KEY----- ... -----END RSA PRIVATE KEY-----
 * -----BEGIN EC PRIVATE KEY----- ... -----END EC PRIVATE KEY-----
 * -----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----
 */
const PRIVATE_KEY_REGEX =
  /(?:-----)?BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY(?:-----)?[\s\S]*?(?:-----)?END (?:[A-Z0-9_-]+ )?PRIVATE KEY(?:-----)?/g;

/**
 * Detects full private key blocks in text.
 */
export function detectPrivateKey(text: string): Detection[] {
  if (!text) return [];
  return findAll(text, PRIVATE_KEY_REGEX, 'private_key', 1.0);
}

// ============================================================================
// 4. High-Entropy Secret & Assignment Detector
// ============================================================================

/**
 * Calculates Shannon entropy in bits per character.
 * H(X) = -sum(p(x) * log2(p(x)))
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  frequencies.forEach((count) => {
    const p = count / len;
    entropy -= p * Math.log2(p);
  });

  return entropy;
}

/**
 * Detects assignments like password=..., passwd:, secret=, token=
 * where the value is 6 or more characters.
 */
const ASSIGNMENT_REGEX =
  /\b(?:password|passwd|secret|token)\s*[:=]\s*(?:['"][^'"]{6,}['"]|[^\s'",;]{6,})/gi;

/**
 * Standalone candidate tokens of 20+ characters (non-whitespace).
 */
const TOKEN_CANDIDATE_REGEX = /(?<!\S)\S{20,}(?!\S)/g;

/**
 * Pattern to identify URL boundaries to exclude from entropy checking.
 */
const URL_REGEX = /https?:\/\/[^\s]+/gi;

/**
 * Pattern to identify file path candidates to exclude from entropy checking.
 */
const FILE_PATH_REGEX = /(?:[a-zA-Z]:\\|\/|\.\/|\.\.\/)[^\s]+/g;

/**
 * Detects high-entropy secrets and credential assignments in text.
 */
export function detectHighEntropy(text: string): Detection[] {
  if (!text) return [];

  const detections: Detection[] = [];

  // 1. Detect assignments (password=..., passwd:, secret=, token= with value length >= 6)
  const assignmentMatches = findAll(text, ASSIGNMENT_REGEX, 'high_entropy_secret', 0.9);
  detections.push(...assignmentMatches);

  // 2. Identify regions to skip: URLs and File Paths
  const excludedSpans: { start: number; end: number }[] = [];

  const urlRegex = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    excludedSpans.push({ start: urlMatch.index, end: urlMatch.index + urlMatch[0].length });
  }

  const filePathRegex = new RegExp(FILE_PATH_REGEX.source, FILE_PATH_REGEX.flags);
  let pathMatch: RegExpExecArray | null;
  while ((pathMatch = filePathRegex.exec(text)) !== null) {
    excludedSpans.push({ start: pathMatch.index, end: pathMatch.index + pathMatch[0].length });
  }

  // 3. Scan for standalone high-entropy tokens (length >= 20, entropy > 4.0)
  const tokenRegex = new RegExp(TOKEN_CANDIDATE_REGEX.source, TOKEN_CANDIDATE_REGEX.flags);
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenRegex.exec(text)) !== null) {
    const rawToken = tokenMatch[0];
    // Strip trailing sentence punctuation if present
    const cleanToken = rawToken.replace(/[.,;:)\]}>"']+$/, '');
    const start = tokenMatch.index;
    const end = start + cleanToken.length;

    if (cleanToken.length < 20) {
      continue;
    }

    // Skip if inside URL or file path
    const isInExcludedSpan = excludedSpans.some(
      (span) => Math.max(span.start, start) < Math.min(span.end, end)
    );
    if (isInExcludedSpan) {
      continue;
    }

    // Skip if token itself looks like a URL or file path
    if (cleanToken.includes('://') || cleanToken.includes('/') || cleanToken.includes('\\')) {
      continue;
    }

    // Skip pure plain English words (only letters, no digits or special chars, typical word casing)
    if (/^[a-zA-Z]+$/.test(cleanToken)) {
      const entropy = calculateShannonEntropy(cleanToken);
      if (entropy <= 4.0) {
        continue;
      }
      // Skip all-lowercase or single-case purely alphabetic words
      if (cleanToken === cleanToken.toLowerCase() || cleanToken === cleanToken.toUpperCase()) {
        continue;
      }
    }

    // Compute Shannon entropy
    const entropy = calculateShannonEntropy(cleanToken);
    if (entropy > 4.0) {
      detections.push({
        type: 'high_entropy_secret',
        value: cleanToken,
        start,
        end,
        confidence: 0.85,
      });
    }
  }

  // Deduplicate and resolve internal overlaps
  detections.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return (b.end - b.start) - (a.end - a.start);
  });

  const accepted: Detection[] = [];
  for (const item of detections) {
    const overlaps = accepted.some(
      (acc) => Math.max(acc.start, item.start) < Math.min(acc.end, item.end)
    );
    if (!overlaps) {
      accepted.push(item);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}
