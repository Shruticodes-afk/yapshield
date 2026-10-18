import { Detector } from './types';
import { findAll } from './utils';

/**
 * Indian Financial System Code (IFSC) Regular Expression.
 * Format:
 * - 4 uppercase letters (Bank Code)
 * - 5th character is always '0' (reserved)
 * - 6 alphanumeric uppercase characters (Branch Code)
 * Example: SBIN0001234, HDFC0000001
 */
const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;

/**
 * Detects Indian IFSC codes in text.
 */
export const detectIfsc: Detector = (text: string) => {
  return findAll(text, IFSC_REGEX, 'ifsc', 0.9);
};

export const ifscDetector = detectIfsc;
export default detectIfsc;
