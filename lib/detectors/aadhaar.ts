import { Detector, Detection } from './types';
import { findAll } from './utils';
import { validateVerhoeff } from './verhoeff';

/**
 * Indian Aadhaar Number Regular Expression:
 * - 12 digits total
 * - Must start with 2-9 (never 0 or 1)
 * - May be written as 12 continuous digits (XXXXXXXXXXXX),
 *   or 3 groups of 4 digits separated by a single space or hyphen (XXXX XXXX XXXX or XXXX-XXXX-XXXX)
 * - Must not be part of a longer digit sequence (guarded by (?<!\d) and (?!\d))
 */
const AADHAAR_REGEX = /(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)/g;

/**
 * Detects Indian Aadhaar numbers in text.
 * Filters candidates through the Verhoeff checksum algorithm.
 * Sets confidence to 0.95 for valid Aadhaar numbers.
 */
export const detectAadhaar: Detector = (text: string): Detection[] => {
  const candidates = findAll(text, AADHAAR_REGEX, 'aadhaar', 0.95);
  return candidates.filter((detection) => validateVerhoeff(detection.value));
};

export const aadhaarDetector = detectAadhaar;
export default detectAadhaar;
