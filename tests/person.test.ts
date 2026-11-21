import { describe, it, expect } from 'vitest';
import { detectPerson } from '@/lib/detectors/person';

describe('Person Detector - Role Words, Salutations, and False Positive Resistance', () => {
  describe('Positive Person Detections (Confidence 0.7)', () => {
    const positiveCases = [
      { text: 'Client Sunita Nair requested verification.', expected: 'Sunita Nair' },
      { text: 'Assigned customer John Doe to high priority ticket.', expected: 'John Doe' },
      { text: 'Admit patient Anita Desai to the ward.', expected: 'Anita Desai' },
      { text: 'Enrolled student Vikram Seth in computer science.', expected: 'Vikram Seth' },
      { text: 'Welcomed employee Rahul Roy to the team.', expected: 'Rahul Roy' },
      { text: 'Interviewed applicant Priya Sharma for developer role.', expected: 'Priya Sharma' },
      { text: 'Evaluated candidate Aarav Patel today.', expected: 'Aarav Patel' },
      { text: 'Active user David Smith updated his profile.', expected: 'David Smith' },
      { text: 'Consultation with dr Rajesh Kumar at the clinic.', expected: 'Rajesh Kumar' },
      { text: 'Appointment for mr Suresh Raina regarding insurance.', expected: 'Suresh Raina' },
      { text: 'Award presented to shri Narendra Sharma at the summit.', expected: 'Narendra Sharma' },
      { text: 'Letter addressed to smt Indira Joshi for the ceremony.', expected: 'Indira Joshi' },
      { text: 'Account name: Sanjay Singhania confirmed.', expected: 'Sanjay Singhania' },
      { text: 'Best wishes,\nRegards, Kabir Khan', expected: 'Kabir Khan' },
      { text: 'Dear Maya Sen, please review the contract.', expected: 'Maya Sen' },
    ];

    for (const testCase of positiveCases) {
      it(`detects name after role/salutation: "${testCase.expected}" in "${testCase.text}"`, () => {
        const results = detectPerson(testCase.text);
        expect(results.length).toBeGreaterThanOrEqual(1);
        const match = results.find((r) => r.value.includes(testCase.expected) || testCase.expected.includes(r.value));
        expect(match).toBeDefined();
        expect(match?.type).toBe('person');
        expect(match?.confidence).toBeGreaterThanOrEqual(0.6);
      });
    }
  });

  describe('Negative Cases - Capitalized Non-Names Following Role Words (False Positive Resistance)', () => {
    const negativeCases = [
      'Customer Support will respond to your ticket shortly.',
      'Client Portal credentials have been updated by admin.',
      'Patient History must be documented before surgery.',
      'Student Services office is open from Monday to Friday.',
      'Employee Handbook contains our ethical guidelines.',
      'Applicant Status is currently under review.',
      'Candidate Profile was submitted to the hiring manager.',
      'User Agreement must be accepted before signing in.',
      'Dear Sir, please find the attachment.',
      'Dear Madam, we received your inquiry.',
      'Dear Customer, your parcel has been dispatched.',
      'Dear All, the annual meeting starts at 10 AM.',
      'Thank you for your business. Regards, Operations Team.',
      'The clinic confirmed your Dr. Appointment for next week.',
      'We spoke with the client. However, no agreement was reached.',
      'Information regarding user Account Details cannot be shared.',
    ];

    for (const text of negativeCases) {
      it(`does NOT detect non-name as person: "${text}"`, () => {
        const results = detectPerson(text);
        // None of the non-name terms (Support, Portal, History, Services, Handbook, Status, Profile, Agreement, Sir, Madam, Customer, All, Team, Appointment, However, Account Details)
        // should be detected as a person name
        for (const res of results) {
          expect(['Support', 'Portal', 'History', 'Services', 'Handbook', 'Status', 'Profile', 'Agreement', 'Sir', 'Madam', 'Customer', 'All', 'Operations Team', 'Appointment', 'However', 'Account Details', 'Details']).not.toContain(res.value);
        }
      });
    }
  });

  describe('Cue Phrases, Stoplists, and Place False Positive Resistance', () => {
    it('detects exactly one person with value "shruti" in "I am shruti and i am in india"', () => {
      const results = detectPerson('I am shruti and i am in india');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('shruti');
      expect(results[0].type).toBe('person');
    });

    it('gives no person for "I am in India", "I am from Delhi", "I am happy today", "I am going to Noida", "I live in Pune"', () => {
      const falsePositiveCases = [
        'I am in India',
        'I am from Delhi',
        'I am happy today',
        'I am going to Noida',
        'I live in Pune',
      ];
      for (const phrase of falsePositiveCases) {
        const results = detectPerson(phrase);
        expect(results).toEqual([]);
      }
    });

    it('gives "Shruti Yadav" for "My name is Shruti Yadav"', () => {
      const results = detectPerson('My name is Shruti Yadav');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Shruti Yadav');
      expect(results[0].type).toBe('person');
    });

    it('gives "Rahul" for "I am Rahul"', () => {
      const results = detectPerson('I am Rahul');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Rahul');
      expect(results[0].type).toBe('person');
    });

    it('gives Rahul and Priya but not India for "Rahul and Priya went to India"', () => {
      const results = detectPerson('Rahul and Priya went to India');
      const values = results.map((r) => r.value);
      expect(values).toContain('Rahul');
      expect(values).toContain('Priya');
      expect(values).not.toContain('India');
      expect(results).toHaveLength(2);
    });

    it('gives "Sunita Nair" for "Dear Sunita Nair, welcome"', () => {
      const results = detectPerson('Dear Sunita Nair, welcome');
      const values = results.map((r) => r.value);
      expect(values).toContain('Sunita Nair');
      expect(values).not.toContain('welcome');
      const match = results.find((r) => r.value === 'Sunita Nair');
      expect(match).toBeDefined();
    });
  });

  describe('Unambiguous Names and Extended Cue Phrases', () => {
    it("'hi im in lucknow shruti' gives person 'shruti' only", () => {
      const results = detectPerson('hi im in lucknow shruti');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('shruti');
      expect(results[0].type).toBe('person');
      expect(results[0].confidence).toBe(0.6);
    });

    it("'HI IM IN LUCKNOW SHRUTI' gives person 'shruti' only", () => {
      const results = detectPerson('HI IM IN LUCKNOW SHRUTI');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('SHRUTI');
      expect(results[0].type).toBe('person');
      expect(results[0].confidence).toBe(0.6);
    });

    it("'shruti' inside 'shrutika' is not matched", () => {
      const results = detectPerson('shrutika is going to school');
      expect(results.some((r) => r.value.toLowerCase() === 'shruti')).toBe(false);
    });

    it("'I am in India' gives nothing", () => {
      const results = detectPerson('I am in India');
      expect(results).toHaveLength(0);
    });

    it("'shruti from lucknow' gives person 'shruti' only and never reports 'lucknow'", () => {
      const results = detectPerson('shruti from lucknow');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('shruti');
      expect(results[0].type).toBe('person');
    });

    it("detects Hinglish patterns: 'mera naam X hai', 'main X hoon', 'mai X hu', 'mujhe X bulao', 'X ka phone', 'X ki id'", () => {
      expect(detectPerson('mera naam Shruti hai').map((r) => r.value)).toEqual(['Shruti']);
      expect(detectPerson('mera naam hai Priya').map((r) => r.value)).toEqual(['Priya']);
      expect(detectPerson('main Rahul hoon').map((r) => r.value)).toEqual(['Rahul']);
      expect(detectPerson('mai Aarav hu').map((r) => r.value)).toEqual(['Aarav']);
      expect(detectPerson('mujhe Vikram bulao').map((r) => r.value)).toEqual(['Vikram']);
      expect(detectPerson('Neha ka phone').map((r) => r.value)).toEqual(['Neha']);
      expect(detectPerson('Karan ki id').map((r) => r.value)).toEqual(['Karan']);
    });
  });
});
