import { Detector } from './types';
import { findAll } from './utils';

/**
 * Indian Permanent Account Number (PAN) Regular Expression.
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F).
 * Bounded by word boundaries (\b).
 */
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;

/**
 * Detects Indian PAN card numbers in text.
 */
export const detectPan: Detector = (text: string) => {
  return findAll(text, PAN_REGEX, 'pan', 0.9);
};

export const panDetector = detectPan;
export default detectPan;
