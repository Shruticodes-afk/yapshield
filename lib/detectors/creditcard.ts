import { Detector, Detection } from './types';
import { findAll } from './utils';

/**
 * Validates a number string using the Luhn checksum algorithm (Mod 10).
 *
 * Steps:
 * 1. Extract only numeric digits.
 * 2. Ensure length is between 13 and 19.
 * 3. Moving right to left, double every second digit.
 *    If doubling results in a number > 9, subtract 9.
 * 4. Sum all digits.
 * 5. Return true if sum % 10 === 0.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  // Iterate backwards from the last digit to the first
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Regular expression to match candidate credit card numbers:
 * - 13 to 19 digits
 * - Optional spaces or hyphens between digits
 * - Bounded so it is not part of a longer digit or hyphen sequence
 */
const CREDIT_CARD_REGEX = /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])/g;

/**
 * Detects credit card numbers in text using regex matching followed by Luhn validation.
 */
export const detectCreditCard: Detector = (text: string): Detection[] => {
  const candidates = findAll(text, CREDIT_CARD_REGEX, 'credit_card', 0.95);
  return candidates.filter((detection) => isValidLuhn(detection.value));
};

export const creditCardDetector = detectCreditCard;
export default detectCreditCard;
