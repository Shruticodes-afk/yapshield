import { PolicyItem, ApplyPolicyResult } from './types';
import { VaultStore, TokenMapping, encryptValue } from '../vault';

/**
 * Custom error thrown when policy evaluation determines content must be blocked.
 * Guarantees that sensitive data values are never exposed in error messages or properties.
 */
export class BlockedError extends Error {
  types: string[];
  reasons: string[];

  constructor(
    typesOrMessage?: string[] | string,
    reasonsOrTypes?: string[] | string[],
    optionalReasons?: string[]
  ) {
    if (typeof typesOrMessage === 'string') {
      super(typesOrMessage);
      this.types = Array.isArray(reasonsOrTypes) ? reasonsOrTypes : [];
      this.reasons = optionalReasons || [];
    } else {
      const types = Array.isArray(typesOrMessage) ? typesOrMessage : [];
      const reasons = Array.isArray(reasonsOrTypes) ? reasonsOrTypes : [];
      super(
        `Content blocked by policy due to sensitive detections: ${types.join(', ')}`
      );
      this.types = types;
      this.reasons = reasons;
    }
    this.name = 'BlockedError';
    Object.setPrototypeOf(this, BlockedError.prototype);
  }
}

/**
 * Applies security policy decisions to text:
 * - Throws BlockedError if any item has action 'block' (never revealing sensitive values)
 * - Masks items with [REDACTED_TYPE] (e.g. [REDACTED_PHONE])
 * - Tokenizes items using Vault AES encryption and ephemeral storage ([TYPE_1], [TYPE_2], etc.)
 * - Reuses tokens for identical sensitive values
 * - Applies string replacements from the end to the start to preserve index offsets
 */
export async function applyPolicy(
  text: string,
  items: PolicyItem[],
  requestId: string,
  store?: VaultStore
): Promise<ApplyPolicyResult> {
  if (!items || items.length === 0) {
    return { sanitized: text, tokenMap: [] };
  }

  // 1. If any item is 'block', immediately throw BlockedError
  const blockedItems = items.filter((item) => item.action === 'block');
  if (blockedItems.length > 0) {
    const uniqueTypes = Array.from(
      new Set(blockedItems.map((item) => item.detection.type))
    );
    const reasons = uniqueTypes.map(
      (type) => `Action 'block' triggered by detection of type '${type}'`
    );
    throw new BlockedError(uniqueTypes, reasons);
  }

  if (!text) {
    return { sanitized: text, tokenMap: [] };
  }

  // 2. Prepare replacements
  // Sort ascending by detection start to assign tokens in reading order
  const sortedByStart = [...items].sort(
    (a, b) => a.detection.start - b.detection.start
  );

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

  const itemReplacements = new Map<PolicyItem, string | null>();

  for (const item of sortedByStart) {
    const det = item.detection;

    if (item.action === 'tokenize') {
      const valueKey = `${det.type}:${det.value}`;
      let token = valueToToken.get(valueKey);

      if (!token) {
        typeCounters[det.type] = (typeCounters[det.type] || 0) + 1;
        const count = typeCounters[det.type];
        const typeLabel = det.type.toUpperCase();
        token = `[${typeLabel}_${count}]`;

        valueToToken.set(valueKey, token);
        tokenMap.push({ token, type: det.type });

        // Encrypt value for secure ephemeral vault storage
        const encryptedValue = encryptValue(det.value);
        entriesToStore.push({
          requestId,
          token,
          encryptedValue,
          expiresAt,
        });
      }

      itemReplacements.set(item, token);
    } else if (item.action === 'mask') {
      const maskToken = `[REDACTED_${det.type.toUpperCase()}]`;
      itemReplacements.set(item, maskToken);
    } else {
      // 'allow' -> no replacement
      itemReplacements.set(item, null);
    }
  }

  // 3. Persist encrypted tokens to vault store if tokenization occurred
  if (entriesToStore.length > 0 && store) {
    await store.save(entriesToStore);
  }

  // 4. Apply replacements from end of text to start to preserve index offsets
  const sortedForReplacement = [...items].sort(
    (a, b) => b.detection.start - a.detection.start
  );

  let sanitized = text;

  for (const item of sortedForReplacement) {
    const replacement = itemReplacements.get(item);
    if (replacement !== null && replacement !== undefined) {
      sanitized =
        sanitized.slice(0, item.detection.start) +
        replacement +
        sanitized.slice(item.detection.end);
    }
  }

  return {
    sanitized,
    tokenMap,
  };
}
