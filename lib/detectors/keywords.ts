import { Detection } from './types';

/**
 * Detects case-insensitive whole-word occurrences of custom confidential keywords in text
 * without constructing regular expressions from user input.
 *
 * @param text - The raw text to inspect
 * @param keywords - Array of confidential words to search for
 * @returns Array of Detection objects with type 'keyword' and confidence 1.0
 */
export function detectKeywords(text: string, keywords: string[]): Detection[] {
  if (!keywords || keywords.length === 0 || !text) {
    return [];
  }

  const allDetections: Detection[] = [];
  const textLower = text.toLowerCase();

  const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);

  for (const keyword of keywords) {
    const trimmed = keyword.trim();
    if (!trimmed) {
      continue;
    }

    const keywordLower = trimmed.toLowerCase();
    const len = keywordLower.length;
    let startPos = 0;

    while (startPos <= textLower.length - len) {
      const matchIndex = textLower.indexOf(keywordLower, startPos);
      if (matchIndex === -1) {
        break;
      }

      const endIndex = matchIndex + len;

      // Word boundary checks:
      // Before matchIndex must not be a word character
      const hasWordBoundaryBefore =
        matchIndex === 0 || !isWordChar(text[matchIndex - 1]);
      // After endIndex must not be a word character
      const hasWordBoundaryAfter =
        endIndex >= text.length || !isWordChar(text[endIndex]);

      if (hasWordBoundaryBefore && hasWordBoundaryAfter) {
        allDetections.push({
          type: 'keyword',
          value: text.slice(matchIndex, endIndex),
          start: matchIndex,
          end: endIndex,
          confidence: 1.0,
        });
      }

      startPos = matchIndex + 1;
    }
  }

  // Deduplicate overlapping or identical keyword matches
  allDetections.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return (b.end - b.start) - (a.end - a.start);
  });

  const uniqueDetections: Detection[] = [];
  for (const item of allDetections) {
    const overlaps = uniqueDetections.some(
      (accepted) => Math.max(accepted.start, item.start) < Math.min(accepted.end, item.end)
    );
    if (!overlaps) {
      uniqueDetections.push(item);
    }
  }

  return uniqueDetections.sort((a, b) => a.start - b.start);
}

export default detectKeywords;
