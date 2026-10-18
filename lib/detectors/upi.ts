import { Detector } from './types';
import { findAll } from './utils';

/**
 * List of known UPI banking handles.
 */
export const KNOWN_UPI_HANDLES = [
  'okaxis',
  'okhdfcbank',
  'oksbi',
  'okicici',
  'ybl',
  'ibl',
  'axl',
  'paytm',
  'upi',
  'apl',
  'sbi',
  'icici',
  'hdfcbank',
] as const;

/**
 * Regex for UPI Virtual Payment Address (VPA): name@bank
 * Matches alphanumeric usernames with dots, hyphens, and underscores before the @
 * followed by a known UPI bank handle. Case-insensitive.
 */
const UPI_REGEX = new RegExp(
  `\\b[a-zA-Z0-9._-]+@(?:${KNOWN_UPI_HANDLES.join('|')})\\b`,
  'gi'
);

/**
 * Detects UPI IDs in text.
 * Confidence is set to 0.95 (higher than email's 0.85) so that UPI handles
 * take precedence over generic email matches during entity merge.
 */
export const detectUpi: Detector = (text: string) => {
  return findAll(text, UPI_REGEX, 'upi', 0.95);
};

export const upiDetector = detectUpi;
export default detectUpi;
