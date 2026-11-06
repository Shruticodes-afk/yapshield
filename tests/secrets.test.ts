import { describe, it, expect } from 'vitest';
import {
  detectApiKeys,
  detectJwt,
  detectPrivateKey,
  detectHighEntropy,
  calculateShannonEntropy,
} from '@/lib/detectors/secrets';
import { detectAll } from '@/lib/detectors';

describe('Secrets Detectors', () => {
  // =========================================================================
  // 1. API Key Detector Tests (All fake generated strings built at runtime)
  // =========================================================================
  describe('detectApiKeys', () => {
    const positiveCases = [
      ['AI', 'za'].join('') + 'x'.repeat(35), // Google API key (39 chars)
      ['sk', '-'].join('') + 'a'.repeat(25), // OpenAI key (28 chars)
      ['gh', 'p_'].join('') + 'b'.repeat(36), // GitHub Personal Access Token
      ['gh', 'o_'].join('') + 'c'.repeat(36), // GitHub OAuth Access Token
      ['github', '_pat_'].join('') + 'd'.repeat(22), // GitHub Fine-grained PAT
      ['AK', 'IA'].join('') + '1234567890ABCDEF', // AWS Access Key ID (20 chars)
      ['xox', 'b-'].join('') + '1234567890-abcdefghij', // Slack Bot Token
    ];

    const negativeCases = [
      ['AI', 'za'].join('') + 'x'.repeat(10), // Too short for Google key
      ['sk', '-'].join('') + 'short', // Too short for OpenAI key (< 20 chars)
      ['AK', 'IA'].join('') + '12345', // Too short for AWS key (< 16 chars)
      ['ak', 'ia'].join('') + '1234567890ABCDEF', // Lowercase prefix (must be uppercase AKIA)
      ['xox', 'c-'].join('') + '1234567890123', // Invalid Slack token type (xoxc)
      ['gh', 'x_'].join('') + 'y'.repeat(36), // Unknown GitHub prefix
      'plain text without any api keys',
    ];

    it('should detect valid API keys (positive cases)', () => {
      for (const key of positiveCases) {
        const results = detectApiKeys(`API credentials: ${key}`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('api_key');
        expect(results[0].value).toBe(key);
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should NOT detect invalid API keys (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectApiKeys(`Sample input: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // 2. JWT Detector Tests
  // =========================================================================
  describe('detectJwt', () => {
    const positiveCases = [
      ['ey', 'J'].join('') + 'a'.repeat(20) + '.' + 'b'.repeat(30) + '.' + 'c'.repeat(25),
      ['ey', 'J'].join('') + 'header123.payload456.signature789',
      ['ey', 'J'].join('') + 'hbGciOiJIUzI1NiJ9.' + ['ey', 'J'].join('') + 'zdWIiOiIxMjM0NTYifQ.c2lnbmF0dXJlX2V4YW1wbGVfdmFsdWU',
      ['ey', 'J'].join('') + 'x'.repeat(15) + '.' + 'y'.repeat(20) + '.' + 'z'.repeat(25),
      ['ey', 'J'].join('') + 'abc_123-def.ghi_456-jkl.mno_789-pqr',
    ];

    const negativeCases = [
      ['ey', 'J'].join('') + 'header.payload', // Only 2 parts, missing signature
      'header.payload.signature', // Does not start with eyJ
      ['ey', 'J'].join('') + 'header.payload.sig.extra', // 4 parts (not standard 3-part JWT)
      ['ey', 'J'].join('') + 'header..signature', // Empty middle part
      ['ey', 'J'].join('') + 'header.payload.', // Empty signature
      'just regular text without tokens',
    ];

    it('should detect valid JWTs (positive cases)', () => {
      for (const jwt of positiveCases) {
        const results = detectJwt(`Bearer ${jwt}`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('jwt');
        expect(results[0].value).toBe(jwt);
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should NOT detect invalid JWTs (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectJwt(`Token input: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // 3. Private Key Detector Tests
  // =========================================================================
  describe('detectPrivateKey', () => {
    const positiveCases = [
      ['-----BEGIN', ' PRIVATE KEY-----'].join('') + '\n' + 'A'.repeat(64) + '\n' + ['-----END', ' PRIVATE KEY-----'].join(''),
      ['-----BEGIN', ' RSA PRIVATE KEY-----'].join('') + '\n' + 'B'.repeat(64) + '\n' + ['-----END', ' RSA PRIVATE KEY-----'].join(''),
      ['-----BEGIN', ' EC PRIVATE KEY-----'].join('') + '\n' + 'C'.repeat(64) + '\n' + ['-----END', ' EC PRIVATE KEY-----'].join(''),
      ['-----BEGIN', ' OPENSSH PRIVATE KEY-----'].join('') + '\n' + 'D'.repeat(64) + '\n' + ['-----END', ' OPENSSH PRIVATE KEY-----'].join(''),
      ['-----BEGIN', ' ENCRYPTED PRIVATE KEY-----'].join('') + '\n' + 'E'.repeat(64) + '\n' + ['-----END', ' ENCRYPTED PRIVATE KEY-----'].join(''),
    ];

    const negativeCases = [
      ['-----BEGIN', ' PUBLIC KEY-----'].join('') + '\n' + 'A'.repeat(64) + '\n' + ['-----END', ' PUBLIC KEY-----'].join(''), // Public key, not private
      ['-----BEGIN', ' CERTIFICATE-----'].join('') + '\n' + 'B'.repeat(64) + '\n' + ['-----END', ' CERTIFICATE-----'].join(''), // Certificate
      ['-----BEGIN', ' RSA PUBLIC KEY-----'].join('') + '\n' + 'C'.repeat(64) + '\n' + ['-----END', ' RSA PUBLIC KEY-----'].join(''), // RSA Public key
      ['-----BEGIN', ' PRIVATE KEY-----'].join('') + '\n' + 'D'.repeat(64), // Missing closing END marker
      'This is documentation about private keys without any PEM block.',
    ];

    it('should detect valid private key PEM blocks (positive cases)', () => {
      for (const keyBlock of positiveCases) {
        const results = detectPrivateKey(`Certificate configuration:\n${keyBlock}`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('private_key');
        expect(results[0].value).toBe(keyBlock);
        expect(results[0].confidence).toBe(1.0);
      }
    });

    it('should NOT detect non-private keys or unclosed blocks (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectPrivateKey(`Configuration:\n${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // 4. High-Entropy Secret Detector Tests
  // =========================================================================
  describe('detectHighEntropy', () => {
    // 24 completely unique characters -> entropy = log2(24) = 4.58 bits/char (> 4.0)
    const highEntropyToken1 = '7xQ#mK9$vL2!aP8@zR5&bT3*';
    const highEntropyToken2 = 'w9$kM2!pQ8@zL5#vX1%aB7&C';

    const positiveCases = [
      'password=sUp3r$ecr3tP@ssw0rd', // password assignment (>= 6 chars)
      'passwd: MySecretCode99', // passwd assignment
      'secret=TopSecretValue123', // secret assignment
      'token=x9Y#mP2$kL8!qZ4*vW', // token assignment
      highEntropyToken1, // Standalone high-entropy 24-char token (entropy 4.58)
      highEntropyToken2, // Standalone high-entropy token
    ];

    const negativeCases = [
      'https://example.com/very/long/path/with/more/than/twenty/characters/in/the/url', // URL skipped
      '/usr/local/share/system/applications/long_directory_path/filename.txt', // File path skipped
      'uncharacteristically', // Plain English word (entropy ~3.3 <= 4.0)
      'a'.repeat(25), // Low entropy repetitive string (entropy 0)
      'password=123', // Assignment with value < 6 chars
      '12345678901234567890', // Low entropy repeated numbers (entropy ~3.32)
    ];

    it('should calculate Shannon entropy correctly', () => {
      expect(calculateShannonEntropy('a'.repeat(20))).toBe(0);
      // High-entropy 24 unique chars
      expect(calculateShannonEntropy(highEntropyToken1)).toBeGreaterThan(4.0);
      // Low-entropy word
      expect(calculateShannonEntropy('uncharacteristically')).toBeLessThanOrEqual(4.0);
    });

    it('should detect assignments and high-entropy secrets (positive cases)', () => {
      for (const secret of positiveCases) {
        const results = detectHighEntropy(`Config setting: ${secret}`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('high_entropy_secret');
      }
    });

    it('should NOT detect URLs, file paths, plain words, or short values (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectHighEntropy(`System info: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // =========================================================================
  // 5. detectAll Priority Integration Tests
  // =========================================================================
  describe('detectAll Priority with Secrets', () => {
    it('should prioritize api_key over high_entropy_secret when overlapping', () => {
      // An OpenAI key is both an API key and high entropy
      const openAiKey = ['sk', '-'].join('') + 'a'.repeat(25);
      const results = detectAll(`OpenAI credentials: ${openAiKey}`);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('api_key');
      expect(results[0].value).toBe(openAiKey);
    });

    it('should prioritize jwt over high_entropy_secret when overlapping', () => {
      const jwtToken = ['ey', 'J'].join('') + 'a'.repeat(20) + '.' + 'b'.repeat(30) + '.' + 'c'.repeat(25);
      const results = detectAll(`Auth header: ${jwtToken}`);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('jwt');
      expect(results[0].value).toBe(jwtToken);
    });

    it('should prioritize private_key over high_entropy_secret when overlapping', () => {
      const privKey = ['-----BEGIN', ' PRIVATE KEY-----'].join('') + '\n' + 'A'.repeat(64) + '\n' + ['-----END', ' PRIVATE KEY-----'].join('');
      const results = detectAll(`Key:\n${privKey}`);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('private_key');
    });

    it('should detect both api_key and high_entropy_secret when not overlapping', () => {
      const apiKey = ['AI', 'za'].join('') + 'x'.repeat(35);
      const text = `Google Key: ${apiKey} and password=ConfidentialPass123`;
      const results = detectAll(text);

      const types = results.map((r) => r.type);
      expect(types).toEqual(['api_key', 'high_entropy_secret']);
    });
  });
});
