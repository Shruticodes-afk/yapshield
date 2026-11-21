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
import { detectCreditCard, isValidLuhn } from './creditcard';
import { detectAadhaar } from './aadhaar';
import { validateVerhoeff } from './verhoeff';
import { detectPerson } from './person';
import { detectKeywords } from './keywords';
import {
  detectApiKeys,
  detectJwt,
  detectPrivateKey,
  detectHighEntropy,
} from './secrets';

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
export * from './secrets';
export * from './injection';

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
  keyword: 12,
  person: 13,
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

const NUMERIC_TYPES = new Set<DetectionType>(['credit_card', 'aadhaar', 'phone']);

export function isNumericType(type: DetectionType): boolean {
  return NUMERIC_TYPES.has(type);
}

/**
 * Checks whether container strictly encloses containee with a longer span.
 */
export function fullyContains(container: Detection, containee: Detection): boolean {
  const spanContainer = container.end - container.start;
  const spanContainee = containee.end - containee.start;
  return (
    container.start <= containee.start &&
    container.end >= containee.end &&
    spanContainer > spanContainee
  );
}

/**
 * Validates checksum for numeric types that possess an algorithmic checksum.
 */
export function passesChecksum(detection: Detection): boolean {
  if (detection.type === 'credit_card') {
    return isValidLuhn(detection.value);
  }
  if (detection.type === 'aadhaar') {
    return validateVerhoeff(detection.value);
  }
  return true;
}

/**
 * Determines which of two overlapping detections is preferred according to security rules:
 * 1) When two detections overlap, prefer the LONGER span first (a detection that fully contains another one wins);
 * 2) if spans are equal or partially overlapping, use the priority list;
 * 3) a detection that fully contains another one of a different numeric type should win only if it passes its own checksum (Luhn for credit_card).
 *
 * @returns true if candidate `a` beats candidate `b`
 */
export function beats(a: Detection, b: Detection): boolean {
  const aContainsB = fullyContains(a, b);
  const bContainsA = fullyContains(b, a);

  // Rule 1 & Rule 3: Longer span wins when one fully contains the other
  if (aContainsB) {
    if (isNumericType(a.type) && isNumericType(b.type) && a.type !== b.type) {
      return passesChecksum(a);
    }
    return true;
  }

  if (bContainsA) {
    if (isNumericType(a.type) && isNumericType(b.type) && a.type !== b.type) {
      return !passesChecksum(b);
    }
    return false;
  }

  // Rule 2: Spans are equal or partially overlapping -> use the priority list
  const priorityA = TYPE_PRIORITY[a.type] ?? 999;
  const priorityB = TYPE_PRIORITY[b.type] ?? 999;
  if (priorityA !== priorityB) {
    return priorityA < priorityB;
  }

  // Tie-breakers
  if (b.confidence !== a.confidence) {
    return b.confidence - a.confidence > 0;
  }

  const spanA = a.end - a.start;
  const spanB = b.end - b.start;
  if (spanB !== spanA) {
    return spanA > spanB;
  }

  return a.start < b.start;
}

/**
 * Resolves overlapping detections according to containment, checksum, and priority rules.
 * Never drops non-overlapping detections.
 */
export function resolveOverlaps(rawDetections: Detection[]): Detection[] {
  if (rawDetections.length <= 1) {
    return [...rawDetections];
  }

  // Deduplicate exact duplicates (identical type, span, and value)
  const candidates: Detection[] = [];
  for (const d of rawDetections) {
    const isDup = candidates.some(
      (c) =>
        c.type === d.type &&
        c.start === d.start &&
        c.end === d.end &&
        c.value === d.value
    );
    if (!isDup) {
      candidates.push(d);
    }
  }

  const accepted: Detection[] = [];

  while (candidates.length > 0) {
    // Find a candidate that is not beaten by any other overlapping candidate
    let bestIndex = -1;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      let isBeaten = false;

      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        const other = candidates[j];
        if (hasOverlap(candidate, other) && beats(other, candidate)) {
          isBeaten = true;
          break;
        }
      }

      if (!isBeaten) {
        bestIndex = i;
        break;
      }
    }

    // Fallback if no candidate is completely undefeated
    if (bestIndex === -1) {
      bestIndex = 0;
      for (let i = 1; i < candidates.length; i++) {
        if (beats(candidates[i], candidates[bestIndex])) {
          bestIndex = i;
        }
      }
    }

    const winner = candidates[bestIndex];
    accepted.push(winner);

    // Rule 4: Never drop a non-overlapping detection.
    // Only eliminate candidates that overlap with the accepted winner.
    const remaining: Detection[] = [];
    for (let i = 0; i < candidates.length; i++) {
      if (i === bestIndex) continue;
      const candidate = candidates[i];
      if (!hasOverlap(winner, candidate)) {
        remaining.push(candidate);
      }
    }
    candidates.length = 0;
    candidates.push(...remaining);
  }

  // Sort accepted detections by start offset ascending
  accepted.sort((a, b) => a.start - b.start);
  return accepted;
}

/**
 * Runs every available detector on the input text, resolves overlapping detections
 * based on priority, containment, and confidence, and returns non-overlapping detections sorted by start index.
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
    ...detectApiKeys(text),
    ...detectJwt(text),
    ...detectPrivateKey(text),
    ...detectUpi(text),
    ...detectPan(text),
    ...detectIfsc(text),
    ...detectPhone(text),
    ...detectEmail(text),
    ...detectHighEntropy(text),
    ...detectPerson(text),
  ];

  // Run keyword detector if keywords option is provided
  if (options?.keywords && options.keywords.length > 0) {
    rawDetections.push(...detectKeywords(text, options.keywords));
  }

  // 2. Resolve overlapping detections
  return resolveOverlaps(rawDetections);
}

export default detectAll;
