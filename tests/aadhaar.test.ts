import { describe, it, expect } from 'vitest';
import { validateVerhoeff, generateVerhoeffCheckDigit } from '@/lib/detectors/verhoeff';
import { detectAadhaar } from '@/lib/detectors/aadhaar';

describe('Aadhaar Detector & Verhoeff Algorithm', () => {
  // -------------------------------------------------------------
  // Verhoeff Unit Tests
  // -------------------------------------------------------------
  describe('Verhoeff Algorithm', () => {
    it('should generate correct check digits and validate them', () => {
      // Standard textbook example: 236 -> check digit 3
      const checkDigit = generateVerhoeffCheckDigit('236');
      expect(checkDigit).toBe('3');
      expect(validateVerhoeff('2363')).toBe(true);
      expect(validateVerhoeff('2364')).toBe(false);
    });

    it('should correctly validate numbers constructed with generateVerhoeffCheckDigit', () => {
      const sampleBases = ['28491823910', '98765432109', '41235678901'];
      for (const base of sampleBases) {
        const checkDigit = generateVerhoeffCheckDigit(base);
        const fullNumber = base + checkDigit;
        expect(validateVerhoeff(fullNumber)).toBe(true);

        // A corrupted number must fail validation
        const corrupted = base + String((parseInt(checkDigit, 10) + 5) % 10);
        expect(validateVerhoeff(corrupted)).toBe(false);
      }
    });
  });

  // -------------------------------------------------------------
  // Aadhaar Detection Tests (Using ONLY fake synthetic data)
  // -------------------------------------------------------------
  describe('detectAadhaar', () => {
    // 11-digit synthetic test prefixes starting with 2-9
    const fakePrefixes = [
      '23456789012',
      '34567890123',
      '45678901234',
      '56789012345',
      '67890123456',
      '78901234567',
      '89012345678',
      '90123456789',
    ];

    it('should detect valid Aadhaar numbers in unspaced form (XXXXXXXXXXXX)', () => {
      for (const prefix of fakePrefixes) {
        const checkDigit = generateVerhoeffCheckDigit(prefix);
        const validNumber = prefix + checkDigit;

        const results = detectAadhaar(`Customer Aadhaar is ${validNumber} for verification.`);
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('aadhaar');
        expect(results[0].value).toBe(validNumber);
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should detect valid Aadhaar numbers in spaced form (XXXX XXXX XXXX)', () => {
      for (const prefix of fakePrefixes) {
        const checkDigit = generateVerhoeffCheckDigit(prefix);
        const validNumber = prefix + checkDigit;
        const spacedNumber = `${validNumber.slice(0, 4)} ${validNumber.slice(4, 8)} ${validNumber.slice(8, 12)}`;

        const results = detectAadhaar(`Aadhaar card: ${spacedNumber}`);
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('aadhaar');
        expect(results[0].value).toBe(spacedNumber);
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should detect valid Aadhaar numbers in hyphenated form (XXXX-XXXX-XXXX)', () => {
      for (const prefix of fakePrefixes) {
        const checkDigit = generateVerhoeffCheckDigit(prefix);
        const validNumber = prefix + checkDigit;
        const hyphenatedNumber = `${validNumber.slice(0, 4)}-${validNumber.slice(4, 8)}-${validNumber.slice(8, 12)}`;

        const results = detectAadhaar(`Provided Aadhaar ID: ${hyphenatedNumber}`);
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('aadhaar');
        expect(results[0].value).toBe(hyphenatedNumber);
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should NOT detect numbers with a wrong last digit (invalid Verhoeff check digit)', () => {
      for (const prefix of fakePrefixes) {
        const validCheckDigit = generateVerhoeffCheckDigit(prefix);
        // Replace check digit with an incorrect one
        const wrongCheckDigit = String((parseInt(validCheckDigit, 10) + 1) % 10);
        const invalidNumber = prefix + wrongCheckDigit;

        const results = detectAadhaar(`Corrupted number: ${invalidNumber}`);
        expect(results).toHaveLength(0);
      }
    });

    it('should NOT detect 11-digit numbers (too short)', () => {
      for (const prefix of fakePrefixes) {
        // prefix is only 11 digits
        const results = detectAadhaar(`Incomplete number: ${prefix}`);
        expect(results).toHaveLength(0);
      }
    });

    it('should NOT detect 13-digit numbers (part of longer digit sequence)', () => {
      for (const prefix of fakePrefixes) {
        const checkDigit = generateVerhoeffCheckDigit(prefix);
        const validNumber = prefix + checkDigit;

        // Append an extra digit (13 digits total)
        const tooLongTrailing = `${validNumber}7`;
        expect(detectAadhaar(`ID: ${tooLongTrailing}`)).toHaveLength(0);

        // Prepend an extra digit (13 digits total)
        const tooLongLeading = `9${validNumber}`;
        expect(detectAadhaar(`ID: ${tooLongLeading}`)).toHaveLength(0);
      }
    });

    it('should NOT detect numbers starting with 0 or 1', () => {
      const zeroPrefix = '01234567890';
      const zeroCheck = generateVerhoeffCheckDigit(zeroPrefix);
      const numberWithZero = zeroPrefix + zeroCheck;
      expect(detectAadhaar(`Number starting with 0: ${numberWithZero}`)).toHaveLength(0);

      const onePrefix = '12345678901';
      const oneCheck = generateVerhoeffCheckDigit(onePrefix);
      const numberWithOne = onePrefix + oneCheck;
      expect(detectAadhaar(`Number starting with 1: ${numberWithOne}`)).toHaveLength(0);
    });
  });
});
