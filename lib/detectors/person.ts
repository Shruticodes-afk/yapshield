import { Detector, Detection } from './types';
import { INDIAN_FIRST_NAMES } from './data/indian-names';

// Set of lowercase names for O(1) membership checking
const INDIAN_NAMES_SET = new Set(INDIAN_FIRST_NAMES.map((name) => name.toLowerCase()));

// Common non-name words to exclude from generic phrase captures
const EXCLUDED_WORDS = new Set([
  'a',
  'an',
  'the',
  'not',
  'here',
  'there',
  'ready',
  'happy',
  'sure',
  'fine',
  'done',
  'sorry',
  'busy',
  'good',
  'great',
  'important',
  'confidential',
  'urgent',
  'writing',
  'going',
  'doing',
  'working',
  'trying',
  'looking',
  'back',
  'home',
  'new',
  'now',
  'also',
  'just',
  'still',
  'today',
  'tonight',
]);

/**
 * Checks if a character index represents the first word of a sentence.
 */
export function isStartOfSentence(text: string, index: number): boolean {
  const preceding = text.slice(0, index).trimEnd();
  if (preceding.length === 0) {
    return true; // Beginning of document
  }
  const lastChar = preceding.charAt(preceding.length - 1);
  return lastChar === '.' || lastChar === '!' || lastChar === '?' || lastChar === '\n';
}

/**
 * Rule (a): Phrases like 'my name is X', 'I am X', 'this is X', 'name: X'
 * followed by 1 to 3 capitalized words.
 */
const PHRASE_REGEX = /\b(?:my name is|i am|this is|name\s*:)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/gi;

/**
 * Rule (b): Titles Mr, Mrs, Ms, Dr, Prof, Shri, Smt followed by 1 to 3 capitalized words.
 */
const TITLE_REGEX = /\b(Mr|Mrs|Ms|Dr|Prof|Shri|Smt)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

/**
 * Rule (c): List of common Indian first names, optionally followed by a capitalized surname.
 */
const INDIAN_NAME_REGEX = new RegExp(
  `\\b(${INDIAN_FIRST_NAMES.join('|')})(?:\\s+([A-Z][a-z]+))?\\b`,
  'g'
);

/**
 * Detects person names using context phrases, honorific titles, and common Indian first names.
 */
export const detectPerson: Detector = (text: string): Detection[] => {
  const candidates: Detection[] = [];

  // ------------------------------------------------------------------
  // Rule (a): Phrase matches (confidence 0.85)
  // ------------------------------------------------------------------
  const phraseRegex = new RegExp(PHRASE_REGEX.source, PHRASE_REGEX.flags);
  let phraseMatch: RegExpExecArray | null;
  while ((phraseMatch = phraseRegex.exec(text)) !== null) {
    const namePart = phraseMatch[1];
    const firstWord = namePart.split(/\s+/)[0].toLowerCase();

    // Skip if captured word is a common adjective/filler word
    if (EXCLUDED_WORDS.has(firstWord)) {
      continue;
    }

    const start = phraseMatch.index + phraseMatch[0].lastIndexOf(namePart);
    const end = start + namePart.length;

    candidates.push({
      type: 'person',
      value: namePart,
      start,
      end,
      confidence: 0.85,
    });
  }

  // ------------------------------------------------------------------
  // Rule (b): Title matches (confidence 0.85)
  // ------------------------------------------------------------------
  const titleRegex = new RegExp(TITLE_REGEX.source, TITLE_REGEX.flags);
  let titleMatch: RegExpExecArray | null;
  while ((titleMatch = titleRegex.exec(text)) !== null) {
    const fullMatch = titleMatch[0];
    const start = titleMatch.index;
    const end = start + fullMatch.length;

    candidates.push({
      type: 'person',
      value: fullMatch,
      start,
      end,
      confidence: 0.85,
    });
  }

  // ------------------------------------------------------------------
  // Rule (c): Indian first name list matches (confidence 0.6)
  // ------------------------------------------------------------------
  const nameRegex = new RegExp(INDIAN_NAME_REGEX.source, INDIAN_NAME_REGEX.flags);
  let nameMatch: RegExpExecArray | null;
  while ((nameMatch = nameRegex.exec(text)) !== null) {
    const matchedText = nameMatch[0];
    const firstName = nameMatch[1];
    const start = nameMatch.index;
    const end = start + matchedText.length;

    // Safety rule: Avoid matching the first word of a sentence unless it is in the names list
    if (isStartOfSentence(text, start)) {
      if (!INDIAN_NAMES_SET.has(firstName.toLowerCase())) {
        continue;
      }
    }

    candidates.push({
      type: 'person',
      value: matchedText,
      start,
      end,
      confidence: 0.6,
    });
  }

  // ------------------------------------------------------------------
  // Deduplicate and resolve overlapping person detections:
  // Higher confidence (0.85 > 0.6) wins; tie-breaker: longer match.
  // ------------------------------------------------------------------
  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenB !== lenA) {
      return lenB - lenA;
    }
    return a.start - b.start;
  });

  const accepted: Detection[] = [];
  for (const candidate of candidates) {
    const overlaps = accepted.some(
      (acc) => Math.max(acc.start, candidate.start) < Math.min(acc.end, candidate.end)
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  // Return sorted by start position
  accepted.sort((a, b) => a.start - b.start);
  return accepted;
};

export const personDetector = detectPerson;
export default detectPerson;
