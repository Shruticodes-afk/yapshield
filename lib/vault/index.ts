/**
 * YapShield - Vault Module
 *
 * Implements tokenization, encryption, storage, and restoration of sensitive entities.
 * Raw values are encrypted using AES-256-GCM and stored ephemerally; sanitized texts
 * are populated with type-specific placeholders ([PHONE_1], [EMAIL_1], etc.).
 */

import { Detection } from '../detectors/types';
import { encryptValue, decryptValue } from './crypto';
import { VaultStore } from './store';

export * from './crypto';
export * from './store';

export interface TokenMapping {
  token: string;
  type: string;
}

export interface TokenizeResult {
  sanitized: string;
  tokenMap: TokenMapping[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokenizes sensitive detections in text:
 * - Replaces detections with tokens formatted as [TYPE_INDEX] (e.g. [PHONE_1], [EMAIL_1])
 * - Reuses the exact same token for identical original values
 * - Applies replacements from end to start to maintain index validity
 * - Encrypts sensitive values and stores them with a 10-minute expiry
 * - Returns sanitized text and token mappings without exposing raw values
 */
export async function tokenize(
  text: string,
  detections: Detection[],
  requestId: string,
  store: VaultStore
): Promise<TokenizeResult> {
  if (!text || detections.length === 0) {
    return { sanitized: text, tokenMap: [] };
  }

  // 1. Assign tokens in order of appearance (start ascending)
  const sortedByStart = [...detections].sort((a, b) => a.start - b.start);

  const detectionToToken = new Map<Detection, string>();
  const valueToToken = new Map<string, string>();
  const typeCounters: Record<string, number> = {};
  const tokenMap: TokenMapping[] = [];
  const entriesToStore: {
    requestId: string;
    token: string;
    encryptedValue: string;
    expiresAt: Date;
  }[] = [];

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  for (const det of sortedByStart) {
    const valueKey = `${det.type}:${det.value}`;
    let token = valueToToken.get(valueKey);

    if (!token) {
      typeCounters[det.type] = (typeCounters[det.type] || 0) + 1;
      const count = typeCounters[det.type];
      const typeLabel = det.type.toUpperCase();
      token = `[${typeLabel}_${count}]`;

      valueToToken.set(valueKey, token);
      tokenMap.push({ token, type: det.type });

      // Encrypt and prepare storage entry
      const encryptedValue = encryptValue(det.value);
      entriesToStore.push({
        requestId,
        token,
        encryptedValue,
        expiresAt,
      });
    }

    detectionToToken.set(det, token);
  }

  // 2. Persist encrypted tokens to vault store
  await store.save(entriesToStore);

  // 3. Apply replacements from end to start so character indexes remain valid
  const sortedForReplacement = [...detections].sort((a, b) => b.start - a.start);
  let sanitized = text;

  for (const det of sortedForReplacement) {
    const token = detectionToToken.get(det);
    if (token) {
      sanitized = sanitized.slice(0, det.start) + token + sanitized.slice(det.end);
    }
  }

  return { sanitized, tokenMap };
}

/**
 * Restores original sensitive values into a sanitized text:
 * - Loads entries from store using requestId
 * - Decrypts values using AES-256-GCM
 * - Replaces tokens with original values (supporting variations like lowercase or missing brackets)
 * - Safely skips failed decryptions without throwing
 * - Deletes stored entries via remove(requestId)
 */
export async function restore(
  text: string,
  requestId: string,
  store: VaultStore
): Promise<string> {
  if (!text) {
    return text;
  }

  const entries = await store.load(requestId);
  if (!entries || entries.length === 0) {
    return text;
  }

  // Decrypt tokens safely
  const decryptedMap = new Map<string, string>(); // token -> plainValue
  for (const entry of entries) {
    try {
      const plain = decryptValue(entry.encryptedValue);
      decryptedMap.set(entry.token, plain);
    } catch {
      // Leave token untouched if decryption fails (e.g. wrong key, tampered ciphertext)
    }
  }

  // Sort tokens by length descending to prevent partial token matches (e.g. [PHONE_10] vs [PHONE_1])
  const sortedTokens = Array.from(decryptedMap.keys()).sort(
    (a, b) => b.length - a.length
  );

  let restored = text;

  for (const token of sortedTokens) {
    const originalValue = decryptedMap.get(token);
    if (!originalValue) continue;

    const rawName = token.replace(/^\[|\]$/g, '');

    // 1. Match bracketed tokens case-insensitively (e.g. [PHONE_1], [phone_1])
    const bracketedRegex = new RegExp(
      `\\[\\s*${escapeRegex(rawName)}\\s*\\]`,
      'gi'
    );
    restored = restored.replace(bracketedRegex, originalValue);

    // 2. Match unbracketed whole-word tokens (e.g. PHONE_1, phone_1)
    const unbracketedRegex = new RegExp(`\\b${escapeRegex(rawName)}\\b`, 'gi');
    restored = restored.replace(unbracketedRegex, originalValue);
  }

  // Cleanup stored entries
  await store.remove(requestId);

  return restored;
}
