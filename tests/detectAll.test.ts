import { describe, it, expect } from 'vitest';
import { detectAll } from '@/lib/detectors';
import { generateVerhoeffCheckDigit } from '@/lib/detectors/verhoeff';

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
});
