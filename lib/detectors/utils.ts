import { Detection, DetectionType } from './types';

/**
 * Helper function to find all occurrences of a pattern in a text string.
 *
 * @param text - The input text to search through
 * @param regex - The regular expression pattern to look for
 * @param type - The category of sensitive data being detected (e.g. 'email', 'phone')
 * @param confidence - Confidence score for this detection (e.g. 0.85, 1.0)
 * @returns An array of Detection objects representing every match found
 */
export function findAll(
  text: string,
  regex: RegExp,
  type: DetectionType,
  confidence: number
): Detection[] {
  const detections: Detection[] = [];

  // Ensure the regular expression has the 'g' (global) flag so it finds all matches, not just the first one
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  const globalRegex = new RegExp(regex.source, flags);

  let match: RegExpExecArray | null;

  // Keep searching until no more matches are found
  while ((match = globalRegex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    // Safety check: if an empty match occurs, advance index to prevent an infinite loop
    if (value.length === 0) {
      globalRegex.lastIndex++;
      continue;
    }

    // Save this detection
    detections.push({
      type,
      value,
      start,
      end,
      confidence,
    });
  }

  return detections;
}
