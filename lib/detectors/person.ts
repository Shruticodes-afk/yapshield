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

// Non-name capitalized words that commonly appear after role words or salutations
const NON_NAME_WORDS = new Set([
  // Department / business / organizational terms
  'support', 'portal', 'service', 'services', 'department', 'team', 'management',
  'agreement', 'handbook', 'policy', 'policies', 'details', 'profile', 'profiles',
  'account', 'accounts', 'record', 'records', 'information', 'data', 'history',
  'form', 'forms', 'report', 'reports', 'center', 'desk', 'office', 'branch',
  'group', 'network', 'company', 'status', 'overview', 'summary', 'guide',
  'guidelines', 'instructions', 'rules', 'feedback', 'query', 'queries',
  'request', 'requests', 'ticket', 'tickets', 'inquiry', 'inquiries', 'order',
  'orders', 'payment', 'payments', 'invoice', 'invoices', 'billing', 'card',
  'file', 'files', 'document', 'documents', 'dashboard', 'app', 'website',
  'platform', 'system', 'systems', 'access', 'login', 'password', 'security',
  'verification', 'registration', 'onboarding', 'activation', 'appointment',
  'appointments', 'consultation', 'checkup', 'surgery', 'meeting', 'interview',
  'evaluation', 'assessment', 'review', 'database', 'table', 'code', 'token',
  // Role / generic titles used as salutations or descriptors
  'sir', 'madam', 'all', 'both', 'everyone', 'customer', 'customers',
  'user', 'users', 'client', 'clients', 'patient', 'patients', 'student',
  'students', 'employee', 'employees', 'applicant', 'applicants', 'candidate',
  'candidates', 'doctor', 'doctors', 'admin', 'admins', 'member', 'members',
  'colleague', 'colleagues', 'friend', 'friends', 'folks', 'people', 'human',
  'unknown', 'anonymous', 'none', 'null', 'na', 'placeholder',
  // Common adjectives / adverbs / fillers
  'new', 'old', 'current', 'former', 'primary', 'secondary', 'general',
  'special', 'regular', 'standard', 'official', 'confidential', 'urgent',
  'important', 'pending', 'approved', 'rejected', 'verified', 'active',
  'inactive', 'ready', 'happy', 'sure', 'fine', 'done', 'sorry', 'busy',
  'good', 'great', 'high', 'low', 'medium', 'first', 'second', 'third',
  'last', 'next', 'previous', 'recent', 'daily', 'weekly', 'monthly', 'annual',
  // Days & Months
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
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
 * Rule (a): Phrases like 'my name is X', 'I am X', 'this is X'
 * followed by 1 to 3 capitalized words.
 */
const PHRASE_REGEX = /\b(?:my name is|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/gi;

/**
 * Rule (b): Role words and salutation patterns like:
 * 'client X', 'customer X', 'patient X', 'student X', 'employee X',
 * 'applicant X', 'candidate X', 'user X', 'mr X', 'mrs X', 'ms X', 'dr X', 'shri X', 'smt X',
 * 'name: X', 'Regards, X', 'Dear X'
 * followed by 1 to 3 capitalized words (confidence 0.7).
 * NOTE: Do NOT use the /i flag here, so that [A-Z][a-z]+ strictly matches capitalized words
 * and does not erroneously consume subsequent lowercase sentence words.
 */
const ROLE_PATTERN_REGEX =
  /\b(?:[Cc]lient|[Cc]ustomer|[Pp]atient|[Ss]tudent|[Ee]mployee|[Aa]pplicant|[Cc]andidate|[Uu]ser|[Mm]r\.?|[Mm]rs\.?|[Mm]s\.?|[Dd]r\.?|[Ss]hri|[Ss]mt|[Nn][Aa][Mm][Ee]\s*:|[Rr]egards\s*,?|[Dd]ear)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

/**
 * Rule (c): Titles Mr, Mrs, Ms, Dr, Prof, Shri, Smt followed by 1 to 3 capitalized words (confidence 0.85).
 */
const TITLE_REGEX = /\b(Mr|Mrs|Ms|Dr|Prof|Shri|Smt)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

/**
 * Rule (d): List of common Indian first names, optionally followed by a capitalized surname.
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
    if (EXCLUDED_WORDS.has(firstWord) || NON_NAME_WORDS.has(firstWord)) {
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
  // Rule (b): Role words and salutation patterns (confidence 0.7)
  // ------------------------------------------------------------------
  const roleRegex = new RegExp(ROLE_PATTERN_REGEX.source, ROLE_PATTERN_REGEX.flags);
  let roleMatch: RegExpExecArray | null;
  while ((roleMatch = roleRegex.exec(text)) !== null) {
    const namePart = roleMatch[1];
    const matchPrefix = roleMatch[0].slice(0, roleMatch[0].lastIndexOf(namePart));

    // Ensure no sentence-ending punctuation separates the role word from the name
    if (/[.!?]/.test(matchPrefix)) {
      continue;
    }

    const words = namePart.trim().split(/\s+/);
    if (words.length === 0 || words.length > 3) {
      continue;
    }

    // Check that every word is a valid capitalized name and not a generic non-name noun/role
    let isInvalid = false;
    for (const w of words) {
      const lower = w.toLowerCase();
      if (
        NON_NAME_WORDS.has(lower) ||
        EXCLUDED_WORDS.has(lower) ||
        !/^[A-Z][a-z]+$/.test(w) ||
        w.length < 2
      ) {
        isInvalid = true;
        break;
      }
    }

    if (isInvalid) {
      continue;
    }

    const start = roleMatch.index + roleMatch[0].lastIndexOf(namePart);
    const end = start + namePart.length;

    candidates.push({
      type: 'person',
      value: namePart,
      start,
      end,
      confidence: 0.7,
    });
  }

  // ------------------------------------------------------------------
  // Rule (c): Title matches (confidence 0.85)
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
