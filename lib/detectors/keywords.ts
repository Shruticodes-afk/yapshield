import { Detection } from './types';
import { findAll } from './utils';

/**
 * Escapes special regular expression characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects case-insensitive whole-word occurrences of custom confidential keywords in text.
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

  for (const keyword of keywords) {
    const trimmed = keyword.trim();
    if (!trimmed) {
      continue;
    }

    const pattern = `\\b${escapeRegex(trimmed)}\\b`;
    const regex = new RegExp(pattern, 'gi');

    const matches = findAll(text, regex, 'keyword', 1.0);
    allDetections.push(...matches);
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
