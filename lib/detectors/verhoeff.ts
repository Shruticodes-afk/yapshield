/**
 * Verhoeff Algorithm Implementation
 *
 * The Verhoeff algorithm is a checksum formula for error detection
 * based on the dihedral group D5. It is used in Indian Aadhaar numbers
 * to catch transcription errors (single-digit errors and adjacent transpositions).
 */

// The multiplication table (d table) based on the dihedral group D5
const d: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// The permutation table (p table)
const p: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// The inverse table (inv table)
const inv: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a number string containing a Verhoeff check digit.
 *
 * @param numStr - The number string to validate (may contain spaces/hyphens)
 * @returns true if the number string satisfies the Verhoeff checksum
 */
export function validateVerhoeff(numStr: string): boolean {
  // Strip out non-digit characters (like spaces or hyphens)
  const digits = numStr.replace(/\D/g, '');

  if (digits.length === 0) {
    return false;
  }

  let c = 0;

  // Process digits from right to left (0-indexed from the rightmost digit)
  for (let i = 0; i < digits.length; i++) {
    const digitChar = digits.charAt(digits.length - 1 - i);
    const digit = parseInt(digitChar, 10);
    c = d[c][p[i % 8][digit]];
  }

  return c === 0;
}

/**
 * Computes and returns the Verhoeff check digit for a given number string.
 *
 * @param numStr - The base number string without check digit
 * @returns Single digit string representing the check digit
 */
export function generateVerhoeffCheckDigit(numStr: string): string {
  // Strip non-digit characters
  const digits = numStr.replace(/\D/g, '');

  let c = 0;

  // When adding the check digit at position 0 (rightmost),
  // the existing digits shift to positions 1, 2, 3, ... from the right
  for (let i = 0; i < digits.length; i++) {
    const digitChar = digits.charAt(digits.length - 1 - i);
    const digit = parseInt(digitChar, 10);
    c = d[c][p[(i + 1) % 8][digit]];
  }

  // The check digit is the inverse of c
  return String(inv[c]);
}
