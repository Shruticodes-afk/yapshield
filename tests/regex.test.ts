import { describe, it, expect } from 'vitest';
import { detectEmail } from '@/lib/detectors/email';
import { detectPhone } from '@/lib/detectors/phone';
import { detectPan } from '@/lib/detectors/pan';
import { detectUpi } from '@/lib/detectors/upi';
import { detectIfsc } from '@/lib/detectors/ifsc';
import { detectCreditCard } from '@/lib/detectors/creditcard';

describe('Regex Detectors', () => {
  // -------------------------------------------------------------
  // 1. Email Detector Tests
  // -------------------------------------------------------------
  describe('Email Detector', () => {
    const positiveCases = [
      'user@example.com',
      'john.doe@company.org',
      'alice_smith@mail.co.uk',
      'test-account+tag@sub.domain.net',
      'support123@service.io',
    ];

    const negativeCases = [
      'plainaddress',
      '@missingusername.com',
      'user@',
      'user@.com',
      'user@domain',
    ];

    it('should detect valid emails (positive cases)', () => {
      for (const email of positiveCases) {
        const results = detectEmail(`Contact us at ${email} for help.`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('email');
        expect(results[0].value).toBe(email);
        expect(results[0].confidence).toBe(0.85);
      }
    });

    it('should not detect invalid emails (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectEmail(`Sample text: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // -------------------------------------------------------------
  // 2. Phone Detector Tests (Indian Mobile)
  // -------------------------------------------------------------
  describe('Phone Detector (Indian Mobile)', () => {
    const positiveCases = [
      '9876543210',
      '+919876543210',
      '+91 98765 43210',
      '+91-87654-32109',
      '07654321098',
      '61234 56789',
    ];

    const negativeCases = [
      '5876543210', // starts with 5 (must be 6-9)
      '1239876543210', // preceded by digits (part of longer digit string)
      '987654321', // 9 digits (too short)
      '98765432109', // 11 digits (longer digit string)
      '98-7654-3210', // hyphen in wrong position
    ];

    it('should detect valid Indian phone numbers (positive cases)', () => {
      for (const phone of positiveCases) {
        const results = detectPhone(`Call me at ${phone} today.`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('phone');
        expect(results[0].value).toBe(phone);
        expect(results[0].confidence).toBe(0.85);
      }
    });

    it('should not detect invalid phone numbers (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectPhone(`Invalid number: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // -------------------------------------------------------------
  // 3. PAN Detector Tests
  // -------------------------------------------------------------
  describe('PAN Detector', () => {
    const positiveCases = [
      'ABCDE1234F',
      'BNZPK5678A',
      'AAAPA9999Z',
      'XYZPU4321B',
      'CLKPS8765C',
    ];

    const negativeCases = [
      'abcde1234f', // lowercase
      'ABCD12345F', // 4 letters then 5 digits
      'ABCDE12345', // ends with digit instead of letter
      'ABCDE123F', // only 3 digits
      '12345ABCDE', // numbers first
    ];

    it('should detect valid PAN numbers (positive cases)', () => {
      for (const pan of positiveCases) {
        const results = detectPan(`My PAN is ${pan}.`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('pan');
        expect(results[0].value).toBe(pan);
        expect(results[0].confidence).toBe(0.9);
      }
    });

    it('should not detect invalid PAN numbers (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectPan(`Invalid PAN: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // -------------------------------------------------------------
  // 4. UPI Detector Tests
  // -------------------------------------------------------------
  describe('UPI Detector', () => {
    const positiveCases = [
      'john.doe@okaxis',
      '9876543210@paytm',
      'merchant_shop@oksbi',
      'alice-smith@ybl',
      'payment.user@icici',
      'buyer@apl',
    ];

    const negativeCases = [
      'user@unknownbank', // unknown handle
      '@okhdfcbank', // missing username
      'user@@paytm', // double @
      'just_text_no_symbol', // no @
      'user@sbibank', // not in known handles list
    ];

    it('should detect valid UPI handles (positive cases)', () => {
      for (const upi of positiveCases) {
        const results = detectUpi(`Send payment to ${upi} please.`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('upi');
        expect(results[0].value.toLowerCase()).toBe(upi.toLowerCase());
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should not detect invalid UPI handles (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectUpi(`Invalid UPI: ${text}`);
        expect(results).toHaveLength(0);
      }
    });

    it('should assign higher confidence to UPI than email for merge step', () => {
      const upiText = 'john@oksbi';
      const upiResults = detectUpi(upiText);
      const emailResults = detectEmail(upiText);

      expect(upiResults[0].confidence).toBeGreaterThan(0.85);
      // UPI should have 0.95 confidence
      expect(upiResults[0].confidence).toBe(0.95);
      // Standard email regex requires a dot in domain, so emailResults is empty or has lower confidence
      if (emailResults.length > 0) {
        expect(upiResults[0].confidence).toBeGreaterThan(emailResults[0].confidence);
      }
    });
  });

  // -------------------------------------------------------------
  // 5. IFSC Detector Tests
  // -------------------------------------------------------------
  describe('IFSC Detector', () => {
    const positiveCases = [
      'SBIN0001234',
      'HDFC0000001',
      'ICIC0002468',
      'PUNB0135790',
      'UTIB0000999',
    ];

    const negativeCases = [
      'sbin0001234', // lowercase
      'SBIN1001234', // 5th char is 1 instead of 0
      'SBI00001234', // only 3 letters at start
      'SBIN00012', // too short
      '12340001234', // numbers at start
    ];

    it('should detect valid IFSC codes (positive cases)', () => {
      for (const ifsc of positiveCases) {
        const results = detectIfsc(`Branch IFSC is ${ifsc}.`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('ifsc');
        expect(results[0].value).toBe(ifsc);
        expect(results[0].confidence).toBe(0.9);
      }
    });

    it('should not detect invalid IFSC codes (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectIfsc(`Invalid IFSC: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });

  // -------------------------------------------------------------
  // 6. Credit Card Detector Tests
  // -------------------------------------------------------------
  describe('Credit Card Detector', () => {
    const positiveCases = [
      '4111 1111 1111 1111',
      '4111-1111-1111-1111',
      '5555 5555 5555 4444',
      '3782 822463 10005',
      '4532 0150 0000 0007',
    ];

    const negativeCases = [
      '4111 1111 1111 1112', // fails Luhn checksum
      '1234 5678 9012', // 12 digits (too short)
      '12345678901234567890', // 20 digits (too long)
      '4532--1234--5678--9010', // invalid double hyphens
      '0000 0000 0000 0001', // fails Luhn checksum
    ];

    it('should detect valid credit card numbers (positive cases)', () => {
      for (const card of positiveCases) {
        const results = detectCreditCard(`Card number: ${card}`);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0].type).toBe('credit_card');
        expect(results[0].value).toBe(card);
        expect(results[0].confidence).toBe(0.95);
      }
    });

    it('should reject invalid credit card numbers (negative cases)', () => {
      for (const text of negativeCases) {
        const results = detectCreditCard(`Invalid card: ${text}`);
        expect(results).toHaveLength(0);
      }
    });
  });
});
