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
});
