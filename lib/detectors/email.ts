import { Detector } from './types';
import { findAll } from './utils';

/**
 * Standard email regular expression.
 * Matches username@domain.extension (e.g. user@example.com).
 */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g;

/**
 * Detects email addresses in text.
 * Confidence is set to 0.85 so UPI handles (0.95) take priority during merge.
 */
export const detectEmail: Detector = (text: string) => {
  return findAll(text, EMAIL_REGEX, 'email', 0.85);
};

export const emailDetector = detectEmail;
export default detectEmail;
