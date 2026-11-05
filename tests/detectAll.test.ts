import { describe, it, expect } from 'vitest';
import {
  detectAll,
  hasOverlap,
  fullyContains,
  beats,
  passesChecksum,
} from '@/lib/detectors';
import { isValidLuhn } from '@/lib/detectors/creditcard';
import {
  generateVerhoeffCheckDigit,
  validateVerhoeff,
} from '@/lib/detectors/verhoeff';

describe('detectAll Integration Tests', () => {
  // -------------------------------------------------------------------------
  // 10 Mixed Realistic Prompts with Sensitive Data
  // -------------------------------------------------------------------------
  describe('Mixed Prompts with Multiple Entity Types', () => {
    it('Prompt 1: Customer Onboarding (Person, Email, Phone, PAN)', () => {
      const prompt =
        'Customer onboarding for Amit Sharma with email amit.sharma@example.com, mobile 9876543210 and PAN ABCDE1234F.';
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['person', 'email', 'phone', 'pan']);
    });

    it('Prompt 2: Banking & UPI Settlement (UPI, IFSC, Phone)', () => {
      const prompt =
        'Please transfer funds to merchant.shop@oksbi via IFSC code SBIN0001234 or call 9123456780.';
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['upi', 'ifsc', 'phone']);
    });

    it('Prompt 3: KYC Verification (Person, Aadhaar, PAN)', () => {
      const aadhaarBase = '28491823910';
      const checkDigit = generateVerhoeffCheckDigit(aadhaarBase);
      const validAadhaar = `${aadhaarBase.slice(0, 4)} ${aadhaarBase.slice(4, 8)} ${aadhaarBase.slice(8, 11)}${checkDigit}`;

      const prompt = `KYC document for Priya Patel with Aadhaar ${validAadhaar} and PAN BNZPK5678A.`;
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['person', 'aadhaar', 'pan']);
    });

    it('Prompt 4: E-Commerce Checkout (Email, Credit Card, Phone)', () => {
      const prompt =
        'Order confirmation sent to buyer@domain.com. Payment charged to card 4111-1111-1111-1111. Inquiries call 98765 12345.';
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['email', 'credit_card', 'phone']);
    });

    it('Prompt 5: Doctor Consultation with Keyword (Person, Keyword, Email)', () => {
      const prompt =
        'Medical summary for Dr. Rajesh Patel marked as CONFIDENTIAL. Email records to clinic@hospital.org.';
      const results = detectAll(prompt, { keywords: ['CONFIDENTIAL'] });
      const types = results.map((r) => r.type);

      expect(types).toEqual(['person', 'keyword', 'email']);
    });

    it('Prompt 6: Vendor Invoice with Keyword (Keyword, UPI, IFSC)', () => {
      const prompt =
        'RESTRICTED invoice: Remit payment to vendor@paytm or bank account with IFSC HDFC0000001.';
      const results = detectAll(prompt, { keywords: ['RESTRICTED'] });
      const types = results.map((r) => r.type);

      expect(types).toEqual(['keyword', 'upi', 'ifsc']);
    });

    it('Prompt 7: Billing Details (Person, Credit Card, Aadhaar)', () => {
      const aadhaarBase = '34567890123';
      const checkDigit = generateVerhoeffCheckDigit(aadhaarBase);
      const validAadhaar = `${aadhaarBase}${checkDigit}`;

      const prompt = `Billing details for Rahul Verma: Card 5555 5555 5555 4444 and Aadhaar ID ${validAadhaar}.`;
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['person', 'credit_card', 'aadhaar']);
    });

    it('Prompt 8: Support Ticket (Phone, Email, UPI)', () => {
      const prompt =
        'Support ticket #402: User contact 09876543210, email support.user@service.io, refund UPI user.refund@ybl.';
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['phone', 'email', 'upi']);
    });

    it('Prompt 9: Loan Application (Person, PAN, IFSC, Phone)', () => {
      const prompt =
        'Loan application submitted by Sneha Rao. PAN: AAAPA9999Z, IFSC: ICIC0002468, phone: +91 99887 76655.';
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['person', 'pan', 'ifsc', 'phone']);
    });

    it('Prompt 10: Multi-Party Settlement with Keyword (Keyword, Person, UPI, Credit Card)', () => {
      const prompt =
        'Audit alert: TOPSECRET payout authorized for Vikram Malhotra to vikram@icici and backup card 4532 0150 0000 0007.';
      const results = detectAll(prompt, { keywords: ['TOPSECRET'] });
      const types = results.map((r) => r.type);

      expect(types).toEqual(['keyword', 'person', 'upi', 'credit_card']);
    });
  });

  // -------------------------------------------------------------------------
  // 10 Clean Prompts (Must return empty array [])
  // -------------------------------------------------------------------------
  describe('Clean Prompts with No Sensitive Data', () => {
    const cleanPrompts = [
      'The quick brown fox jumps over the lazy dog in the sunny park.',
      'Please review this pull request and merge the changes into main branch.',
      'Next.js App Router provides server components and streaming responses.',
      'Artificial intelligence and machine learning algorithms are advancing rapidly.',
      'We scheduled our quarterly project retrospective meeting for tomorrow afternoon.',
      'Remember to drink plenty of water and take regular breaks during work hours.',
      'Database migration completed successfully with zero schema errors.',
      'HTTP status code 200 indicates that the server request has succeeded.',
      'CSS grid and modern flexbox layouts make responsive design seamless.',
      'Modern web frameworks enhance developer experience with fast refresh and modular architecture.',
    ];

    cleanPrompts.forEach((prompt, index) => {
      it(`Clean Prompt ${index + 1} returns empty array`, () => {
        const results = detectAll(prompt);
        expect(results).toEqual([]);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Overlap Resolution Rules & Edge Cases
  // -------------------------------------------------------------------------
  describe('Overlap Resolution Rules & Containment', () => {
    /**
     * Builds a Luhn-valid 16-digit credit card number whose first 12 digits
     * also pass the Aadhaar Verhoeff checksum algorithm.
     */
    function buildLuhnCardWithVerhoeffPrefix(): {
      card: string;
      rawDigits: string;
      prefix12: string;
    } {
      // 1. Aadhaar requires starting with 2-9. Visa card prefix '4' qualifies.
      const base11 = '45321876420'; // 11 digits starting with 4
      const verhoeffDigit = generateVerhoeffCheckDigit(base11);
      const prefix12 = base11 + verhoeffDigit;
      expect(validateVerhoeff(prefix12)).toBe(true);

      // 2. Add 4 more digits to complete 16 digits such that isValidLuhn is true
      const prefix15 = prefix12 + '123';
      for (let d = 0; d <= 9; d++) {
        const candidate16 = prefix15 + String(d);
        if (isValidLuhn(candidate16)) {
          const formatted = `${candidate16.slice(0, 4)} ${candidate16.slice(4, 8)} ${candidate16.slice(8, 12)} ${candidate16.slice(12, 16)}`;
          return {
            card: formatted,
            rawDigits: candidate16,
            prefix12,
          };
        }
      }
      throw new Error('Unable to construct Luhn-valid 16 digit card');
    }

    /**
     * Builds a Luhn-valid 16-digit card whose trailing digits 5-16
     * pass the Aadhaar Verhoeff checksum.
     */
    function buildLuhnCardWithVerhoeffSuffix(): {
      card: string;
      rawDigits: string;
      suffix12: string;
    } {
      const base11 = '29384756102'; // 11 digits starting with 2
      const verhoeffDigit = generateVerhoeffCheckDigit(base11);
      const suffix12 = base11 + verhoeffDigit;
      expect(validateVerhoeff(suffix12)).toBe(true);

      for (let d = 0; d <= 9; d++) {
        const candidate16 = `411${d}` + suffix12;
        if (isValidLuhn(candidate16)) {
          const formatted = `${candidate16.slice(0, 4)} ${candidate16.slice(4, 8)} ${candidate16.slice(8, 12)} ${candidate16.slice(12, 16)}`;
          return {
            card: formatted,
            rawDigits: candidate16,
            suffix12,
          };
        }
      }
      throw new Error('Unable to construct Luhn-valid 16 digit card with Verhoeff suffix');
    }

    it('Rule 1 & 3: Luhn-valid 16-digit card whose digits 1-12 pass Verhoeff wins over Aadhaar', () => {
      const { card, prefix12 } = buildLuhnCardWithVerhoeffPrefix();

      // Verify that the first 12 digits pass Verhoeff
      expect(validateVerhoeff(prefix12)).toBe(true);
      // Verify that the full card passes Luhn
      expect(isValidLuhn(card)).toBe(true);

      const prompt = `Please process the payment using card number ${card}.`;
      const results = detectAll(prompt);

      // Only credit_card should be returned; the subsumed aadhaar must be dropped
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('credit_card');
      expect(results[0].value).toBe(card);
      expect(results.some((r) => r.type === 'aadhaar')).toBe(false);
    });

    it('Rule 1 & 3: Luhn-valid 16-digit card whose digits 5-16 pass Verhoeff wins over Aadhaar', () => {
      const { card, suffix12 } = buildLuhnCardWithVerhoeffSuffix();

      expect(validateVerhoeff(suffix12)).toBe(true);
      expect(isValidLuhn(card)).toBe(true);

      const prompt = `Charge the renewal fee to card ${card} now.`;
      const results = detectAll(prompt);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('credit_card');
      expect(results[0].value).toBe(card);
      expect(results.some((r) => r.type === 'aadhaar')).toBe(false);
    });

    it('Rule 4: Phone number next to an Aadhaar number in the same sentence preserves both', () => {
      const aadhaarBase = '49281726354';
      const checkDigit = generateVerhoeffCheckDigit(aadhaarBase);
      const validAadhaar = `${aadhaarBase.slice(0, 4)} ${aadhaarBase.slice(4, 8)} ${aadhaarBase.slice(8, 11)}${checkDigit}`;
      const phoneNumber = '9876543210';

      const prompt = `Please contact customer care at ${phoneNumber} or verify your Aadhaar number ${validAadhaar} immediately.`;
      const results = detectAll(prompt);

      const types = results.map((r) => r.type);
      expect(types).toEqual(['phone', 'aadhaar']);

      const phoneDetection = results.find((r) => r.type === 'phone');
      const aadhaarDetection = results.find((r) => r.type === 'aadhaar');

      expect(phoneDetection).toBeDefined();
      expect(phoneDetection?.value).toBe(phoneNumber);
      expect(aadhaarDetection).toBeDefined();
      expect(aadhaarDetection?.value).toBe(validAadhaar);
    });

    it('Rule 4: Phone number directly followed by an email preserves both', () => {
      const phoneNumber = '9876543210';
      const email = 'support@yapshield.io';

      // Test with standard delimiter / space separation
      const prompt1 = `Support contacts: ${phoneNumber} ${email} for urgent escalations.`;
      const results1 = detectAll(prompt1);
      expect(results1.map((r) => r.type)).toEqual(['phone', 'email']);
      expect(results1[0].value).toBe(phoneNumber);
      expect(results1[1].value).toBe(email);

      // Test with slash separation
      const prompt2 = `Direct hotline: ${phoneNumber}/${email}`;
      const results2 = detectAll(prompt2);
      expect(results2.map((r) => r.type)).toEqual(['phone', 'email']);

      // Test with colon separation
      const prompt3 = `Call: ${phoneNumber}, Email: ${email}`;
      const results3 = detectAll(prompt3);
      expect(results3.map((r) => r.type)).toEqual(['phone', 'email']);
    });

    it('Rule 3: Enclosing numeric detection that fails checksum does not beat inner valid numeric detection', () => {
      const aadhaarBase = '56781234901';
      const checkDigit = generateVerhoeffCheckDigit(aadhaarBase);
      const validAadhaar = `${aadhaarBase.slice(0, 4)} ${aadhaarBase.slice(4, 8)} ${aadhaarBase.slice(8, 11)}${checkDigit}`;

      // Construct a fake detection where a credit_card candidate fails Luhn
      const innerAadhaar = {
        type: 'aadhaar' as const,
        value: validAadhaar,
        start: 10,
        end: 24,
        confidence: 0.95,
      };

      const invalidLuhnCard = {
        type: 'credit_card' as const,
        value: '4000 0000 0000 0003', // Invalid Luhn
        start: 5,
        end: 26,
        confidence: 0.95,
      };

      expect(passesChecksum(invalidLuhnCard)).toBe(false);
      expect(passesChecksum(innerAadhaar)).toBe(true);
      expect(fullyContains(invalidLuhnCard, innerAadhaar)).toBe(true);

      // Because invalidLuhnCard fails Luhn, it cannot beat innerAadhaar
      expect(beats(invalidLuhnCard, innerAadhaar)).toBe(false);
      expect(beats(innerAadhaar, invalidLuhnCard)).toBe(true);
    });

    it('Rule 2: Spans that are equal or partially overlapping break ties via priority list', () => {
      // UPI handle and Email overlap on the same span
      const prompt = 'Remit payment to user.billing@oksbi for confirmation.';
      const results = detectAll(prompt);

      // UPI (priority 6) beats Email (priority 10)
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('upi');
      expect(results[0].value).toBe('user.billing@oksbi');
    });

    it('Rule 4: Multiple distinct non-overlapping entities are all preserved', () => {
      const aadhaarBase = '88887777666';
      const checkDigit = generateVerhoeffCheckDigit(aadhaarBase);
      const validAadhaar = `${aadhaarBase}${checkDigit}`;

      const prompt = `Records: Aadhaar ${validAadhaar}, PAN ABCDE1234F, IFSC HDFC0001234, and Phone 9123456789.`;
      const results = detectAll(prompt);
      const types = results.map((r) => r.type);

      expect(types).toEqual(['aadhaar', 'pan', 'ifsc', 'phone']);
    });
  });
});
