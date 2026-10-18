import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  evaluate,
  applyPolicy,
  BlockedError,
  PRESETS,
  Student,
  Developer,
  Enterprise,
  Policy,
} from '@/lib/policy';
import { Detection } from '@/lib/detectors/types';
import { InMemoryVaultStore } from '@/lib/vault/store';
import { restore } from '@/lib/vault';

describe('Policy Engine & Guardrails (/lib/policy)', () => {
  const originalEnvSecret = process.env.VAULT_SECRET;
  const FAKE_TEST_SECRET =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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

  // ---------------------------------------------------------------------------
  // 1. Presets Verification
  // ---------------------------------------------------------------------------
  describe('Presets Configuration', () => {
    it('PRESETS exports Student, Developer, and Enterprise policies', () => {
      expect(PRESETS.Student).toBeDefined();
      expect(PRESETS.Developer).toBeDefined();
      expect(PRESETS.Enterprise).toBeDefined();
      expect(PRESETS.student).toBe(PRESETS.Student);
      expect(PRESETS.developer).toBe(PRESETS.Developer);
      expect(PRESETS.enterprise).toBe(PRESETS.Enterprise);
    });

    it('Student preset has balanced mode, reviewRequired true, threshold 60, correct rules', () => {
      expect(Student.name).toBe('Student');
      expect(Student.mode).toBe('balanced');
      expect(Student.reviewRequired).toBe(true);
      expect(Student.injectionThreshold).toBe(60);
      expect(Student.rules.email).toBe('mask');
      expect(Student.rules.phone).toBe('mask');
      expect(Student.rules.person).toBe('tokenize');
      expect(Student.rules.aadhaar).toBe('block');
      expect(Student.rules.pan).toBe('block');
      expect(Student.rules.credit_card).toBe('block');
      expect(Student.rules.api_key).toBe('block');
      expect(Student.rules.jwt).toBe('block');
      expect(Student.rules.private_key).toBe('block');
      expect(Student.rules.high_entropy_secret).toBe('block');
      expect(Student.rules.upi).toBe('mask');
      expect(Student.rules.ifsc).toBe('mask');
    });

    it('Developer preset has balanced mode, reviewRequired false, threshold 60, correct rules', () => {
      expect(Developer.name).toBe('Developer');
      expect(Developer.mode).toBe('balanced');
      expect(Developer.reviewRequired).toBe(false);
      expect(Developer.injectionThreshold).toBe(60);
      expect(Developer.rules.api_key).toBe('block');
      expect(Developer.rules.jwt).toBe('block');
      expect(Developer.rules.private_key).toBe('block');
      expect(Developer.rules.high_entropy_secret).toBe('block');
      expect(Developer.rules.email).toBe('tokenize');
      expect(Developer.rules.phone).toBe('tokenize');
      expect(Developer.rules.person).toBe('allow');
      expect(Developer.rules.aadhaar).toBe('block');
      expect(Developer.rules.pan).toBe('block');
      expect(Developer.rules.credit_card).toBe('block');
      expect(Developer.rules.upi).toBe('tokenize');
      expect(Developer.rules.ifsc).toBe('allow');
    });

    it('Enterprise preset has strict mode, reviewRequired true, threshold 40, correct rules', () => {
      expect(Enterprise.name).toBe('Enterprise');
      expect(Enterprise.mode).toBe('strict');
      expect(Enterprise.reviewRequired).toBe(true);
      expect(Enterprise.injectionThreshold).toBe(40);
      expect(Enterprise.rules.person).toBe('tokenize');
      expect(Enterprise.rules.email).toBe('tokenize');
      expect(Enterprise.rules.aadhaar).toBe('block');
      expect(Enterprise.rules.credit_card).toBe('block');
      expect(Enterprise.rules.api_key).toBe('block');
      expect(Enterprise.rules.jwt).toBe('block');
      expect(Enterprise.rules.private_key).toBe('block');
      expect(Enterprise.rules.high_entropy_secret).toBe('block');
      expect(Enterprise.rules.pan).toBe('block');
      expect(Enterprise.rules.upi).toBe('block');
      expect(Enterprise.rules.ifsc).toBe('block');
      expect(Enterprise.rules.phone).toBe('block');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Decision Matrix: All 4 Outcomes (allow, sanitize, review, block)
  // ---------------------------------------------------------------------------
  describe('Decision Matrix (allow | sanitize | review | block)', () => {
    it('returns allow for clean text with zero findings', () => {
      const result = evaluate([], null, Student);
      expect(result.decision).toBe('allow');
      expect(result.items).toHaveLength(0);
      expect(result.risk.score).toBe(0);
    });

    it('returns allow when all detected entities are explicitly allowed and reviewRequired is false', () => {
      const personDetection: Detection = {
        type: 'person',
        value: 'Aarav Patel',
        start: 0,
        end: 11,
        confidence: 0.9,
      };

      const result = evaluate([personDetection], null, Developer);
      expect(result.decision).toBe('allow');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('allow');
    });

    it('returns sanitize when reviewRequired is false and items contain mask or tokenize', () => {
      const phoneDetection: Detection = {
        type: 'phone',
        value: '9876543210',
        start: 0,
        end: 10,
        confidence: 0.95,
      };

      // Developer policy tokenizes phone and has reviewRequired: false
      const result = evaluate([phoneDetection], null, Developer);
      expect(result.decision).toBe('sanitize');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('tokenize');
    });

    it('returns review when reviewRequired is true and non-blocking findings exist', () => {
      const phoneDetection: Detection = {
        type: 'phone',
        value: '9876543210',
        start: 0,
        end: 10,
        confidence: 0.95,
      };

      // Student policy masks phone and has reviewRequired: true
      const result = evaluate([phoneDetection], null, Student);
      expect(result.decision).toBe('review');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('mask');
    });

    it('returns review when reviewRequired is true and low prompt injection is detected below threshold', () => {
      const injectionTelemetry = {
        score: 35,
        level: 'medium' as const,
        matches: [
          {
            category: 'instruction_override',
            pattern: 'test',
            reason: 'Test pattern',
            weight: 35,
            start: 0,
            end: 4,
          },
        ],
      };

      // Student injection threshold is 60; score 35 is below threshold
      const result = evaluate([], injectionTelemetry, Student);
      expect(result.decision).toBe('review');
      expect(result.risk.score).toBeGreaterThan(0);
    });

    it('returns block when any detected item has action block', () => {
      const apiKeyDetection: Detection = {
        type: 'api_key',
        value: 'sk-1234567890abcdef1234567890',
        start: 0,
        end: 30,
        confidence: 1.0,
      };

      const result = evaluate([apiKeyDetection], null, Developer);
      expect(result.decision).toBe('block');
      expect(result.items[0].action).toBe('block');
    });

    it('returns block when prompt injection score is at or above threshold', () => {
      const injectionTelemetry = {
        score: 65,
        level: 'high' as const,
        matches: [
          {
            category: 'instruction_override',
            pattern: 'ignore rules',
            reason: 'Instruction override',
            weight: 65,
            start: 0,
            end: 12,
          },
        ],
      };

      // Developer threshold is 60; score 65 >= 60 triggers block
      const result = evaluate([], injectionTelemetry, Developer);
      expect(result.decision).toBe('block');
    });

    it('returns block when injection score reaches lower Enterprise threshold (40)', () => {
      const injectionTelemetry = {
        score: 45,
        level: 'medium' as const,
        matches: [],
      };

      // Enterprise threshold is 40; 45 >= 40 triggers block
      const result = evaluate([], injectionTelemetry, Enterprise);
      expect(result.decision).toBe('block');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Strict & Lenient Mode Adjustments and Unknown Types
  // ---------------------------------------------------------------------------
  describe('Mode Adjustments (Strict Upgrades & Lenient Downgrades)', () => {
    it('strict mode upgrades mask to block for high-weight types (>= 70)', () => {
      const customStrictPolicy: Policy = {
        name: 'CustomStrict',
        mode: 'strict',
        rules: {
          pan: 'mask', // weight 70 -> should be upgraded to block
          credit_card: 'mask', // weight 85 -> should be upgraded to block
          phone: 'mask', // weight 35 -> not high weight, stays mask
        },
        injectionThreshold: 50,
        reviewRequired: false,
      };

      const panDetection: Detection = {
        type: 'pan',
        value: 'ABCDE1234F',
        start: 0,
        end: 10,
        confidence: 0.9,
      };
      const phoneDetection: Detection = {
        type: 'phone',
        value: '9876543210',
        start: 15,
        end: 25,
        confidence: 0.9,
      };

      const result = evaluate(
        [panDetection, phoneDetection],
        null,
        customStrictPolicy
      );

      const panItem = result.items.find((i) => i.detection.type === 'pan');
      const phoneItem = result.items.find((i) => i.detection.type === 'phone');

      expect(panItem?.action).toBe('block');
      expect(phoneItem?.action).toBe('mask');
      expect(result.decision).toBe('block');
    });

    it('strict mode defaults unknown types to block', () => {
      const strictPolicy: Policy = {
        name: 'StrictEmpty',
        mode: 'strict',
        rules: {},
        injectionThreshold: 50,
        reviewRequired: false,
      };

      const phoneDetection: Detection = {
        type: 'phone',
        value: '9876543210',
        start: 0,
        end: 10,
        confidence: 0.8,
      };

      const result = evaluate([phoneDetection], null, strictPolicy);
      expect(result.items[0].action).toBe('block');
      expect(result.decision).toBe('block');
    });

    it('lenient mode downgrades mask to tokenize for low-weight types (<= 40)', () => {
      const customLenientPolicy: Policy = {
        name: 'CustomLenient',
        mode: 'lenient',
        rules: {
          phone: 'mask', // weight 35 -> should be downgraded to tokenize
          email: 'mask', // weight 30 -> should be downgraded to tokenize
          ifsc: 'mask', // weight 40 -> should be downgraded to tokenize
          upi: 'mask', // weight 50 -> medium weight, stays mask
        },
        injectionThreshold: 80,
        reviewRequired: false,
      };

      const phoneDet: Detection = {
        type: 'phone',
        value: '9876543210',
        start: 0,
        end: 10,
        confidence: 0.9,
      };
      const emailDet: Detection = {
        type: 'email',
        value: 'test@example.com',
        start: 12,
        end: 28,
        confidence: 0.9,
      };
      const ifscDet: Detection = {
        type: 'ifsc',
        value: 'SBIN0001234',
        start: 30,
        end: 41,
        confidence: 0.9,
      };
      const upiDet: Detection = {
        type: 'upi',
        value: 'user@okhdfcbank',
        start: 43,
        end: 58,
        confidence: 0.9,
      };

      const result = evaluate(
        [phoneDet, emailDet, ifscDet, upiDet],
        null,
        customLenientPolicy
      );

      const phoneItem = result.items.find((i) => i.detection.type === 'phone');
      const emailItem = result.items.find((i) => i.detection.type === 'email');
      const ifscItem = result.items.find((i) => i.detection.type === 'ifsc');
      const upiItem = result.items.find((i) => i.detection.type === 'upi');

      expect(phoneItem?.action).toBe('tokenize');
      expect(emailItem?.action).toBe('tokenize');
      expect(ifscItem?.action).toBe('tokenize');
      expect(upiItem?.action).toBe('mask');
    });

    it('balanced mode defaults unknown types to mask without upgrading/downgrading', () => {
      const balancedPolicy: Policy = {
        name: 'BalancedEmpty',
        mode: 'balanced',
        rules: {},
        injectionThreshold: 60,
        reviewRequired: false,
      };

      const phoneDet: Detection = {
        type: 'phone',
        value: '9876543210',
        start: 0,
        end: 10,
        confidence: 0.9,
      };

      const result = evaluate([phoneDet], null, balancedPolicy);
      expect(result.items[0].action).toBe('mask');
      expect(result.decision).toBe('sanitize');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Fail-Closed on Invalid Policy
  // ---------------------------------------------------------------------------
  describe('Fail-Closed Error Handling', () => {
    it('fails closed to block when policy is null', () => {
      const result = evaluate([], null, null);
      expect(result.decision).toBe('block');
      expect(result.risk.score).toBe(100);
      expect(result.risk.level).toBe('critical');
    });

    it('fails closed to block when policy is undefined', () => {
      const result = evaluate([], null, undefined);
      expect(result.decision).toBe('block');
      expect(result.risk.score).toBe(100);
    });

    it('fails closed when policy is empty object or missing mode/rules', () => {
      const result = evaluate([], null, {} as any);
      expect(result.decision).toBe('block');
      expect(result.risk.score).toBe(100);
    });

    it('fails closed if an exception is thrown', () => {
      const throwingPolicy = new Proxy({} as Policy, {
        get() {
          throw new Error('Explosion');
        },
      });

      const result = evaluate([], null, throwingPolicy);
      expect(result.decision).toBe('block');
      expect(result.risk.score).toBe(100);
      expect(result.risk.level).toBe('critical');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. applyPolicy: Masking, Tokenizing & Restoration
  // ---------------------------------------------------------------------------
  describe('applyPolicy Transformation & Vault Storage', () => {
    it('correctly applies masking with [REDACTED_TYPE]', async () => {
      const text = 'Contact phone 9876543210 or email test@example.com.';
      const items = [
        {
          detection: {
            type: 'phone' as const,
            value: '9876543210',
            start: 14,
            end: 24,
            confidence: 0.9,
          },
          action: 'mask' as const,
          reason: 'Mask phone',
        },
        {
          detection: {
            type: 'email' as const,
            value: 'test@example.com',
            start: 34,
            end: 50,
            confidence: 0.9,
          },
          action: 'mask' as const,
          reason: 'Mask email',
        },
      ];

      const { sanitized, tokenMap } = await applyPolicy(
        text,
        items,
        'req-mask-1',
        store
      );

      expect(sanitized).toBe(
        'Contact phone [REDACTED_PHONE] or email [REDACTED_EMAIL].'
      );
      expect(tokenMap).toHaveLength(0);
    });

    it('correctly applies tokenization with [TYPE_N] and stores in vault', async () => {
      const text = 'Employee Rahul Sharma has contact 9876543210.';
      const items = [
        {
          detection: {
            type: 'person' as const,
            value: 'Rahul Sharma',
            start: 9,
            end: 21,
            confidence: 0.85,
          },
          action: 'tokenize' as const,
          reason: 'Tokenize person',
        },
        {
          detection: {
            type: 'phone' as const,
            value: '9876543210',
            start: 34,
            end: 44,
            confidence: 0.95,
          },
          action: 'tokenize' as const,
          reason: 'Tokenize phone',
        },
      ];

      const requestId = 'req-tok-1';
      const { sanitized, tokenMap } = await applyPolicy(
        text,
        items,
        requestId,
        store
      );

      expect(sanitized).toBe(
        'Employee [PERSON_1] has contact [PHONE_1].'
      );
      expect(tokenMap).toEqual([
        { token: '[PERSON_1]', type: 'person' },
        { token: '[PHONE_1]', type: 'phone' },
      ]);

      // Can restore original text from vault store
      const restored = await restore(sanitized, requestId, store);
      expect(restored).toBe(text);
    });

    it('reuses identical tokens for duplicate sensitive values', async () => {
      const text = 'Primary phone: 9876543210, alternate phone: 9876543210.';
      const items = [
        {
          detection: {
            type: 'phone' as const,
            value: '9876543210',
            start: 15,
            end: 25,
            confidence: 0.95,
          },
          action: 'tokenize' as const,
          reason: 'Tokenize phone',
        },
        {
          detection: {
            type: 'phone' as const,
            value: '9876543210',
            start: 44,
            end: 54,
            confidence: 0.95,
          },
          action: 'tokenize' as const,
          reason: 'Tokenize phone',
        },
      ];

      const requestId = 'req-dup-1';
      const { sanitized, tokenMap } = await applyPolicy(
        text,
        items,
        requestId,
        store
      );

      expect(sanitized).toBe(
        'Primary phone: [PHONE_1], alternate phone: [PHONE_1].'
      );
      expect(tokenMap).toEqual([{ token: '[PHONE_1]', type: 'phone' }]);

      const restored = await restore(sanitized, requestId, store);
      expect(restored).toBe(text);
    });

    it('handles mixed actions (allow, mask, tokenize) without index drift', async () => {
      // Allow person, mask email, tokenize phone
      const text = 'User Priya Patel with mail priya@gmail.com and phone 9876543210.';
      const items = [
        {
          detection: {
            type: 'person' as const,
            value: 'Priya Patel',
            start: 5,
            end: 16,
            confidence: 0.9,
          },
          action: 'allow' as const,
          reason: 'Allow person',
        },
        {
          detection: {
            type: 'email' as const,
            value: 'priya@gmail.com',
            start: 27,
            end: 42,
            confidence: 0.9,
          },
          action: 'mask' as const,
          reason: 'Mask email',
        },
        {
          detection: {
            type: 'phone' as const,
            value: '9876543210',
            start: 53,
            end: 63,
            confidence: 0.95,
          },
          action: 'tokenize' as const,
          reason: 'Tokenize phone',
        },
      ];

      const requestId = 'req-mixed-1';
      const { sanitized, tokenMap } = await applyPolicy(
        text,
        items,
        requestId,
        store
      );

      expect(sanitized).toBe(
        'User Priya Patel with mail [REDACTED_EMAIL] and phone [PHONE_1].'
      );
      expect(tokenMap).toEqual([{ token: '[PHONE_1]', type: 'phone' }]);

      // Restoring restores tokenized phone, while masked email stays redacted
      const restored = await restore(sanitized, requestId, store);
      expect(restored).toBe(
        'User Priya Patel with mail [REDACTED_EMAIL] and phone 9876543210.'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. BlockedError on Block Action
  // ---------------------------------------------------------------------------
  describe('BlockedError Behavior', () => {
    it('throws BlockedError when any item action is block', async () => {
      const text = 'Secret credentials: sk-1234567890abcdef1234567890';
      const items = [
        {
          detection: {
            type: 'api_key' as const,
            value: 'sk-1234567890abcdef1234567890',
            start: 20,
            end: 50,
            confidence: 1.0,
          },
          action: 'block' as const,
          reason: 'Block API key',
        },
      ];

      await expect(
        applyPolicy(text, items, 'req-block-1', store)
      ).rejects.toThrow(BlockedError);
    });

    it('BlockedError instance carries types array and reasons array', async () => {
      const items = [
        {
          detection: {
            type: 'aadhaar' as const,
            value: '2345 6789 0123',
            start: 0,
            end: 14,
            confidence: 1.0,
          },
          action: 'block' as const,
          reason: 'Block Aadhaar',
        },
        {
          detection: {
            type: 'pan' as const,
            value: 'ABCDE1234F',
            start: 15,
            end: 25,
            confidence: 1.0,
          },
          action: 'block' as const,
          reason: 'Block PAN',
        },
      ];

      try {
        await applyPolicy('2345 6789 0123 ABCDE1234F', items, 'req-err-1', store);
        expect.unreachable('Should have thrown BlockedError');
      } catch (err) {
        expect(err).toBeInstanceOf(BlockedError);
        const blockedErr = err as BlockedError;
        expect(blockedErr.types).toContain('aadhaar');
        expect(blockedErr.types).toContain('pan');
        expect(blockedErr.reasons.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Data Privacy: Verifying No Sensitive Value in Errors or Return Values
  // ---------------------------------------------------------------------------
  describe('Data Privacy & Leak Prevention', () => {
    const rawSensitiveSecret = 'AIzaSySecretApiKey99999999999999999';
    const rawAadhaar = '9999 8888 7777';
    const rawPhone = '9876543210';

    it('evaluate return values (decision, items, risk reasons) never contain raw values', () => {
      const detections: Detection[] = [
        {
          type: 'api_key',
          value: rawSensitiveSecret,
          start: 0,
          end: rawSensitiveSecret.length,
          confidence: 1.0,
        },
        {
          type: 'aadhaar',
          value: rawAadhaar,
          start: 50,
          end: 50 + rawAadhaar.length,
          confidence: 1.0,
        },
      ];

      const result = evaluate(detections, null, Student);

      // Inspect risk reasons
      for (const reason of result.risk.reasons) {
        expect(reason).not.toContain(rawSensitiveSecret);
        expect(reason).not.toContain(rawAadhaar);
      }

      // Inspect item reasons
      for (const item of result.items) {
        expect(item.reason).not.toContain(rawSensitiveSecret);
        expect(item.reason).not.toContain(rawAadhaar);
      }
    });

    it('BlockedError message and properties never contain raw sensitive values', async () => {
      const items = [
        {
          detection: {
            type: 'api_key' as const,
            value: rawSensitiveSecret,
            start: 0,
            end: rawSensitiveSecret.length,
            confidence: 1.0,
          },
          action: 'block' as const,
          reason: 'Action block',
        },
      ];

      try {
        await applyPolicy(rawSensitiveSecret, items, 'req-leak-1', store);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BlockedError);
        expect(err.message).not.toContain(rawSensitiveSecret);
        for (const reason of err.reasons) {
          expect(reason).not.toContain(rawSensitiveSecret);
        }
      }
    });

    it('applyPolicy return value sanitized and tokenMap never contain raw sensitive values', async () => {
      const originalText = `Confidential contact: ${rawPhone}`;
      const items = [
        {
          detection: {
            type: 'phone' as const,
            value: rawPhone,
            start: 22,
            end: 22 + rawPhone.length,
            confidence: 0.95,
          },
          action: 'tokenize' as const,
          reason: 'Tokenize',
        },
      ];

      const result = await applyPolicy(originalText, items, 'req-leak-2', store);

      expect(result.sanitized).not.toContain(rawPhone);
      expect(JSON.stringify(result.tokenMap)).not.toContain(rawPhone);
    });
  });
});
