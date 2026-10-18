import { Detector } from './types';
import { findAll } from './utils';

/**
 * Indian Mobile Phone Number Regular Expression.
 *
 * Rules:
 * - Optional prefix: +91 or 0 (with optional space or hyphen)
 * - 10 digits total, with the first digit between 6 and 9
 * - Allows exactly one space or hyphen after the first 5 digits (e.g. 98765-43210 or 98765 43210)
 * - Must not be part of a longer digit string (enforced via lookbehind (?<![\d+]) and lookahead (?!\d))
 */
const PHONE_REGEX = /(?<![\d+])(?:\+91[ -]?|0[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)/g;

/**
 * Detects Indian mobile phone numbers in text.
 */
export const detectPhone: Detector = (text: string) => {
  return findAll(text, PHONE_REGEX, 'phone', 0.85);
};

export const phoneDetector = detectPhone;
export default detectPhone;
