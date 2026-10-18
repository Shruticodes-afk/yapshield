import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { tokenize, restore } from '@/lib/vault';
import { InMemoryVaultStore } from '@/lib/vault/store';
import { encryptValue, decryptValue } from '@/lib/vault/crypto';
import { detectAll } from '@/lib/detectors';

describe('Vault Tokenize & Restore Engine', () => {
  const originalEnvSecret = process.env.VAULT_SECRET;
  // 64-character hex string representing exactly 32 bytes
  const FAKE_TEST_SECRET =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const DIFFERENT_FAKE_SECRET =
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  let store: InMemoryVaultStore;

  beforeEach(() => {
    process.env.VAULT_SECRET = FAKE_TEST_SECRET;
    store = new InMemoryVaultStore();
  });

  afterAll(() => {
    if (originalEnvSecret) {
      process.env.VAULT_SECRET = originalEnvSecret;
    } else {
      delete process.env.VAULT_SECRET;
    }
  });

  // -------------------------------------------------------------------------
  // 1. Basic Tokenize & Restore Roundtrip
  // -------------------------------------------------------------------------
  it('tokenize then restore must give back the exact original text', async () => {
    const originalText =
      'Please contact Rahul Sharma at rahul@gmail.com or call 9876543210 regarding invoice.';
    const detections = detectAll(originalText);
    const requestId = 'req-roundtrip-1';

    const { sanitized, tokenMap } = await tokenize(
      originalText,
      detections,
      requestId,
      store
    );

    // Verify sanitized structure
    expect(sanitized).not.toContain('Rahul Sharma');
    expect(sanitized).not.toContain('rahul@gmail.com');
    expect(sanitized).not.toContain('9876543210');
    expect(tokenMap.length).toBe(3);

    // Verify restore
    const restoredText = await restore(sanitized, requestId, store);
    expect(restoredText).toBe(originalText);
  });

  // -------------------------------------------------------------------------
  // 2. Repeated Values Reuse the Same Token
  // -------------------------------------------------------------------------
  it('repeated sensitive values must reuse the same token', async () => {
    const originalText =
      'Call primary phone 9876543210 or emergency phone 9876543210 right now.';
    const detections = detectAll(originalText);
    const requestId = 'req-repeated-1';

    expect(detections.length).toBe(2);
    expect(detections[0].value).toBe('9876543210');
    expect(detections[1].value).toBe('9876543210');

    const { sanitized, tokenMap } = await tokenize(
      originalText,
      detections,
      requestId,
      store
    );

    // Both occurrences should use [PHONE_1]
    expect(sanitized).toBe(
      'Call primary phone [PHONE_1] or emergency phone [PHONE_1] right now.'
    );
    expect(tokenMap).toEqual([{ token: '[PHONE_1]', type: 'phone' }]);

    // Restores both identical tokens back to original number
    const restored = await restore(sanitized, requestId, store);
    expect(restored).toBe(originalText);
  });

  // -------------------------------------------------------------------------
  // 3. Sanitized Text Must Not Contain Any Original Sensitive Value
  // -------------------------------------------------------------------------
  it('the sanitized text must not contain any original sensitive value', async () => {
    const originalText =
      'Account holder Amit Kumar with PAN ABCDE1234F and card 4111-1111-1111-1111.';
    const detections = detectAll(originalText);
    const requestId = 'req-privacy-1';

    const { sanitized } = await tokenize(originalText, detections, requestId, store);

    for (const det of detections) {
      expect(sanitized).not.toContain(det.value);
    }
  });

  // -------------------------------------------------------------------------
  // 4. Restoring After Remove Returns Text Unchanged
  // -------------------------------------------------------------------------
  it('restoring after remove returns the text unchanged', async () => {
    const originalText = 'Call doctor at 9876543210.';
    const detections = detectAll(originalText);
    const requestId = 'req-remove-1';

    const { sanitized } = await tokenize(originalText, detections, requestId, store);

    // First restore succeeds and automatically calls remove(requestId)
    const firstRestore = await restore(sanitized, requestId, store);
    expect(firstRestore).toBe(originalText);

    // Second restore on the sanitized text finds no entries, returns sanitized text as is
    const secondRestore = await restore(sanitized, requestId, store);
    expect(secondRestore).toBe(sanitized);
  });

  // -------------------------------------------------------------------------
  // 5. Wrong Key Fails Safely
  // -------------------------------------------------------------------------
  it('wrong key fails safely without throwing and leaves token intact', async () => {
    const originalText = 'Secret contact: 9876543210.';
    const detections = detectAll(originalText);
    const requestId = 'req-wrong-key-1';

    const { sanitized } = await tokenize(originalText, detections, requestId, store);

    // Switch to a different secret key
    process.env.VAULT_SECRET = DIFFERENT_FAKE_SECRET;

    // Restore should not throw; it should leave [PHONE_1] in the text
    let restored: string | undefined;
    expect(async () => {
      restored = await restore(sanitized, requestId, store);
    }).not.toThrow();

    const result = await restore(sanitized, requestId, store);
    expect(result).toContain('[PHONE_1]');
    expect(result).not.toContain('9876543210');
  });

  // -------------------------------------------------------------------------
  // 6. Tampered Ciphertext Fails Safely
  // -------------------------------------------------------------------------
  it('tampered ciphertext fails safely without throwing', async () => {
    const originalText = 'User phone: 9876543210.';
    const detections = detectAll(originalText);
    const requestId = 'req-tamper-1';

    const { sanitized } = await tokenize(originalText, detections, requestId, store);

    // Tamper with the stored ciphertext
    const storedEntries = await store.load(requestId);
    expect(storedEntries.length).toBe(1);

    const parts = storedEntries[0].encryptedValue.split(':');
    // Replace ciphertext part with invalid garbage
    const tamperedPayload = `${parts[0]}:${parts[1]}:dGFtcGVyZWQtZ2FyYmFnZQ==`;

    await store.remove(requestId);
    await store.save([
      {
        requestId,
        token: storedEntries[0].token,
        encryptedValue: tamperedPayload,
        expiresAt: new Date(Date.now() + 600000),
      },
    ]);

    // Restore should catch authentication tag failure and leave token intact
    const restored = await restore(sanitized, requestId, store);
    expect(restored).toContain('[PHONE_1]');
    expect(restored).not.toContain('9876543210');
  });

  // -------------------------------------------------------------------------
  // 7. Small Model Variations (Lowercase or Missing Brackets)
  // -------------------------------------------------------------------------
  it('restores tokens with small model changes like lowercase or missing brackets', async () => {
    const originalText = 'Contact 9876543210.';
    const detections = detectAll(originalText);
    const requestId = 'req-variation-1';

    await tokenize(originalText, detections, requestId, store);

    // Simulated LLM output 1: Lowercase brackets [phone_1]
    const llmOutput1 = 'Please call [phone_1] for immediate assistance.';
    const restored1 = await restore(llmOutput1, requestId, store);
    expect(restored1).toBe('Please call 9876543210 for immediate assistance.');

    // Save entries again to test missing brackets
    await tokenize(originalText, detections, 'req-variation-2', store);
    const llmOutput2 = 'Dial PHONE_1 directly.';
    const restored2 = await restore(llmOutput2, 'req-variation-2', store);
    expect(restored2).toBe('Dial 9876543210 directly.');
  });

  // -------------------------------------------------------------------------
  // 8. Crypto Unit Validation
  // -------------------------------------------------------------------------
  describe('crypto.ts unit tests', () => {
    it('encrypts and decrypts correctly', () => {
      const plaintext = 'SuperConfidentialData!#123';
      const encrypted = encryptValue(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3);

      const decrypted = decryptValue(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('throws error when VAULT_SECRET is missing', () => {
      delete process.env.VAULT_SECRET;
      expect(() => encryptValue('test')).toThrow(/VAULT_SECRET.*missing/i);
    });

    it('throws error when VAULT_SECRET is not 32 bytes (wrong length)', () => {
      process.env.VAULT_SECRET = 'abcdef'; // only 3 bytes
      expect(() => encryptValue('test')).toThrow(/32 bytes/i);
    });

    it('throws error when decrypting malformed payload', () => {
      expect(() => decryptValue('not:valid')).toThrow(/Invalid encrypted payload/i);
    });
  });
});
