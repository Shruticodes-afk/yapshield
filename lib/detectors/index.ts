/**
 * YapShield Detection Engine
 *
 * Coordinates all individual detectors, runs them across input text,
 * and merges overlapping detections according to defined security priorities.
 */

import { Detection, DetectionType } from './types';
import { detectEmail } from './email';
import { detectPhone } from './phone';
import { detectPan } from './pan';
import { detectUpi } from './upi';
import { detectIfsc } from './ifsc';
import { detectCreditCard } from './creditcard';
import { detectAadhaar } from './aadhaar';
import { detectPerson } from './person';
import { detectKeywords } from './keywords';

// Re-export types and individual detectors for convenience
export * from './types';
export * from './email';
export * from './phone';
export * from './pan';
export * from './upi';
export * from './ifsc';
export * from './creditcard';
export * from './aadhaar';
export * from './person';
export * from './keywords';

/**
 * Priority ranking for entity types when resolving overlaps.
 * Lower number = higher priority.
 * Order: aadhaar, credit_card, api_key, jwt, private_key, upi, pan, ifsc, phone, email, high_entropy_secret, person, keyword.
 */
export const TYPE_PRIORITY: Record<DetectionType, number> = {
  aadhaar: 1,
  credit_card: 2,
  api_key: 3,
  jwt: 4,
  private_key: 5,
  upi: 6,
  pan: 7,
  ifsc: 8,
  phone: 9,
  email: 10,
  high_entropy_secret: 11,
  person: 12,
  keyword: 13,
};

export interface DetectAllOptions {
  keywords?: string[];
}

/**
 * Checks whether two detections overlap in the text.
 */
export function hasOverlap(a: Detection, b: Detection): boolean {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

/**
 * Runs every available detector on the input text, resolves overlapping detections
 * based on priority and confidence, and returns non-overlapping detections sorted by start index.
 *
 * @param text - The raw text to scan
 * @param options - Optional configuration including custom confidential keywords
 * @returns Array of Detection objects sorted by start position
 */
export function detectAll(text: string, options?: DetectAllOptions): Detection[] {
  if (!text) {
    return [];
  }

  // 1. Run all individual detectors
  const rawDetections: Detection[] = [
    ...detectAadhaar(text),
    ...detectCreditCard(text),
    ...detectUpi(text),
    ...detectPan(text),
    ...detectIfsc(text),
    ...detectPhone(text),
    ...detectEmail(text),
    ...detectPerson(text),
  ];

  // Run keyword detector if keywords option is provided
  if (options?.keywords && options.keywords.length > 0) {
    rawDetections.push(...detectKeywords(text, options.keywords));
  }

  // 2. Sort candidates to resolve overlaps:
  //    - Higher priority first (lower priority number)
  //    - Higher confidence as tie-breaker
  //    - Longer match span as second tie-breaker
  //    - Start index ascending as final tie-breaker
  rawDetections.sort((a, b) => {
    const priorityA = TYPE_PRIORITY[a.type] ?? 999;
    const priorityB = TYPE_PRIORITY[b.type] ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    const spanA = a.end - a.start;
    const spanB = b.end - b.start;
    if (spanB !== spanA) {
      return spanB - spanA;
    }

    return a.start - b.start;
  });

  // 3. Keep non-overlapping detections
  const accepted: Detection[] = [];
  for (const candidate of rawDetections) {
    const overlaps = accepted.some((existing) => hasOverlap(existing, candidate));
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  // 4. Return results sorted by start index
  accepted.sort((a, b) => a.start - b.start);
  return accepted;
}

export default detectAll;
