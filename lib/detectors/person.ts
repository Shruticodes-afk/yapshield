import { Detector, Detection } from './types';
import { INDIAN_FIRST_NAMES } from './data/indian-names';

// Major countries, Indian states and Union Territories, and major Indian cities/NCR
const PLACE_STOPLIST = new Set([
  // Countries
  'india',
  'usa',
  'uk',
  'us',
  'nepal',
  'china',
  'pakistan',
  'bangladesh',
  'sri lanka',
  'bhutan',
  'myanmar',
  'afghanistan',
  'japan',
  'russia',
  'germany',
  'france',
  'canada',
  'australia',
  'singapore',
  'malaysia',
  'dubai',
  'uae',
  'united states',
  'united kingdom',
  'america',

  // Indian States & Union Territories
  'andhra pradesh',
  'arunachal pradesh',
  'assam',
  'bihar',
  'chhattisgarh',
  'goa',
  'gujarat',
  'haryana',
  'himachal pradesh',
  'jharkhand',
  'karnataka',
  'kerala',
  'madhya pradesh',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'punjab',
  'rajasthan',
  'sikkim',
  'tamil nadu',
  'telangana',
  'tripura',
  'uttar pradesh',
  'uttarakhand',
  'west bengal',
  'delhi',
  'jammu',
  'kashmir',
  'ladakh',
  'chandigarh',
  'puducherry',
  'pondicherry',
  'andaman',
  'nicobar',
  'lakshadweep',

  // Major Indian Cities & NCR
  'mumbai',
  'new delhi',
  'bengaluru',
  'bangalore',
  'hyderabad',
  'ahmedabad',
  'chennai',
  'kolkata',
  'surat',
  'pune',
  'jaipur',
  'lucknow',
  'kanpur',
  'nagpur',
  'indore',
  'thane',
  'bhopal',
  'visakhapatnam',
  'patna',
  'vadodara',
  'ghaziabad',
  'ludhiana',
  'agra',
  'nashik',
  'faridabad',
  'meerut',
  'rajkot',
  'varanasi',
  'srinagar',
  'aurangabad',
  'dhanbad',
  'amritsar',
  'navi mumbai',
  'allahabad',
  'prayagraj',
  'howrah',
  'ranchi',
  'gwalior',
  'jabalpur',
  'coimbatore',
  'vijayawada',
  'jodhpur',
  'madurai',
  'raipur',
  'kota',
  'guwahati',
  'mysore',
  'mysuru',
  'gurgaon',
  'gurugram',
  'noida',
  'greater noida',
  'kochi',
  'cochin',
  'dehradun',
  'mangalore',
  'mangaluru',
  'trivandrum',
  'thiruvananthapuram',
  'bhubaneswar',
]);

// Set of lowercase names for O(1) membership checking (excluding 'india' and places)
const INDIAN_NAMES_SET = new Set(
  INDIAN_FIRST_NAMES
    .map((name) => name.toLowerCase())
    .filter((name) => name !== 'india' && !PLACE_STOPLIST.has(name))
);

// Common stopwords and connectors that must never be captured as person names
const STOP_WORDS = new Set([
  'in',
  'from',
  'at',
  'on',
  'to',
  'and',
  'or',
  'the',
  'a',
  'an',
  'going',
  'coming',
  'living',
  'staying',
  'here',
  'there',
  'very',
  'so',
  'not',
  'just',
  'also',
  'feeling',
  'happy',
  'sad',
  'fine',
  'ok',
  'okay',
  'student',
  'engineer',
  'developer',
  'doctor',
  'working',
  'studying',
  'learning',
  'looking',
  'trying',
  'ready',
  'sure',
  'sorry',
  'with',
  'by',
  'for',
  'of',
  'about',
  'into',
  'over',
  'after',
  'before',
  'under',
  'between',
  'through',
  'during',
  'without',
  'again',
  'then',
  'but',
  'nor',
  'yet',
  'both',
  'either',
  'neither',
  'as',
  'if',
  'while',
  'because',
  'since',
  'until',
  'unless',
  'than',
  'i',
  'me',
  'my',
  'myself',
  'you',
  'your',
  'yours',
  'yourself',
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'it',
  'its',
  'itself',
  'we',
  'our',
  'ours',
  'ourselves',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'this',
  'that',
  'these',
  'those',
  'who',
  'whom',
  'whose',
  'which',
  'what',
  'where',
  'when',
  'why',
  'how',
  'all',
  'any',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'only',
  'own',
  'same',
  'too',
  'can',
  'will',
  'don',
  'should',
  'now',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'do',
  'does',
  'did',
  'doing',
  'would',
  'could',
  'went',
  'go',
  'goes',
  'gone',
  'come',
  'comes',
  'came',
  'live',
  'lives',
  'lived',
  'stay',
  'stays',
  'stayed',
  'feel',
  'feels',
  'felt',
  'work',
  'works',
  'worked',
  'study',
  'studies',
  'studied',
  'learn',
  'learns',
  'learned',
  'look',
  'looks',
  'looked',
  'try',
  'tries',
  'tried',
  'want',
  'wants',
  'wanted',
  'need',
  'needs',
  'needed',
  'like',
  'likes',
  'liked',
  'today',
  'tonight',
  'tomorrow',
  'yesterday',
  'good',
  'great',
  'bad',
  'busy',
  'done',
  'new',
  'old',
  'still',
  'writing',
  'reading',
  'speaking',
  'calling',
  'talking',
  'sending',
  'please',
  'thanks',
  'thank',
  'welcome',
  'hello',
  'hi',
  'hey',
]);

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
 * Checks whether a word or phrase represents a place.
 */
function isPlace(str: string): boolean {
  const norm = str.trim().toLowerCase();
  if (PLACE_STOPLIST.has(norm)) {
    return true;
  }
  const parts = norm.split(/\s+/);
  if (parts.length > 1 && parts.every((p) => PLACE_STOPLIST.has(p) || STOP_WORDS.has(p))) {
    return true;
  }
  return false;
}

/**
 * Extracts 1 to 3 name words following a cue phrase.
 * Stops at the first stopword, place, non-name, or word that fails the name candidate criteria.
 */
function extractCueName(
  text: string,
  startIndex: number
): { value: string; start: number; end: number } | null {
  let curIndex = startIndex;
  const words: { word: string; start: number; end: number }[] = [];

  while (words.length < 3 && curIndex < text.length) {
    if (words.length > 0) {
      const spaceMatch = /^[ \t]+/.exec(text.slice(curIndex));
      if (!spaceMatch) {
        break; // Stop at punctuation or line break
      }
      curIndex += spaceMatch[0].length;
    }

    const wordMatch = /^[A-Za-z]+/.exec(text.slice(curIndex));
    if (!wordMatch) {
      break;
    }

    const rawWord = wordMatch[0];
    const lower = rawWord.toLowerCase();

    // Stop at any stopword or non-name
    if (STOP_WORDS.has(lower) || NON_NAME_WORDS.has(lower) || EXCLUDED_WORDS.has(lower)) {
      break;
    }

    // Stop at any place
    if (PLACE_STOPLIST.has(lower)) {
      break;
    }

    // Name candidate condition: starts with uppercase OR exact match in Indian names list
    const isCapitalized = /^[A-Z][a-z]*$/.test(rawWord);
    const isInNamesList = INDIAN_NAMES_SET.has(lower);

    if (!isCapitalized && !isInNamesList) {
      break;
    }

    const wStart = curIndex;
    const wEnd = curIndex + rawWord.length;
    words.push({ word: rawWord, start: wStart, end: wEnd });
    curIndex = wEnd;
  }

  if (words.length === 0) {
    return null;
  }

  const fullValue = text.slice(words[0].start, words[words.length - 1].end);
  if (isPlace(fullValue)) {
    return null;
  }

  return {
    value: fullValue,
    start: words[0].start,
    end: words[words.length - 1].end,
  };
}

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
 * Rule (a): Cue phrases like 'my name is', 'I am', 'this is', 'name:'
 */
const CUE_PHRASE_REGEX = /\b(?:my name is|i am|this is)\s+|\bname\s*:\s*/gi;

/**
 * Rule (b): Role words and salutation patterns like:
 * 'client X', 'customer X', 'patient X', 'student X', 'employee X',
 * 'applicant X', 'candidate X', 'user X', 'mr X', 'mrs X', 'ms X', 'dr X', 'shri X', 'smt X',
 * 'name: X', 'Regards, X', 'Dear X'
 * followed by 1 to 3 capitalized words (confidence 0.7).
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
  `\\b(${INDIAN_FIRST_NAMES.filter((n) => n.toLowerCase() !== 'india' && !PLACE_STOPLIST.has(n.toLowerCase())).join('|')})(?:\\s+([A-Z][a-z]+))?\\b`,
  'g'
);

/**
 * Detects person names using context phrases, honorific titles, and common Indian first names.
 */
export const detectPerson: Detector = (text: string): Detection[] => {
  const candidates: Detection[] = [];

  // ------------------------------------------------------------------
  // Rule (a): Cue phrase matches (confidence 0.85)
  // ------------------------------------------------------------------
  const cueRegex = new RegExp(CUE_PHRASE_REGEX.source, CUE_PHRASE_REGEX.flags);
  let cueMatch: RegExpExecArray | null;
  while ((cueMatch = cueRegex.exec(text)) !== null) {
    const afterCueIndex = cueMatch.index + cueMatch[0].length;
    const captured = extractCueName(text, afterCueIndex);
    if (captured) {
      candidates.push({
        type: 'person',
        value: captured.value,
        start: captured.start,
        end: captured.end,
        confidence: 0.85,
      });
      cueRegex.lastIndex = Math.max(cueRegex.lastIndex, captured.end);
    }
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

    const rawWords = namePart.trim().split(/\s+/);
    const validWords: string[] = [];
    for (const w of rawWords) {
      const lower = w.toLowerCase();
      if (
        STOP_WORDS.has(lower) ||
        PLACE_STOPLIST.has(lower) ||
        NON_NAME_WORDS.has(lower) ||
        EXCLUDED_WORDS.has(lower) ||
        !/^[A-Z][a-z]+$/.test(w) ||
        w.length < 2
      ) {
        break; // Stop at first stopword or non-name
      }
      validWords.push(w);
    }

    if (validWords.length === 0 || validWords.length > 3) {
      continue;
    }

    const cleanedName = validWords.join(' ');
    if (isPlace(cleanedName)) {
      continue;
    }

    const start = roleMatch.index + roleMatch[0].lastIndexOf(namePart);
    const end = start + cleanedName.length;

    candidates.push({
      type: 'person',
      value: cleanedName,
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
    const titleNamePart = titleMatch[2];
    const words = titleNamePart.trim().split(/\s+/);
    const firstLower = words[0].toLowerCase();
    if (
      STOP_WORDS.has(firstLower) ||
      PLACE_STOPLIST.has(firstLower) ||
      NON_NAME_WORDS.has(firstLower) ||
      EXCLUDED_WORDS.has(firstLower)
    ) {
      continue;
    }

    const fullMatch = titleMatch[0];
    if (isPlace(titleNamePart) || isPlace(fullMatch)) {
      continue;
    }

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
  // Rule (d): Indian first name list matches (confidence 0.6)
  // ------------------------------------------------------------------
  const nameRegex = new RegExp(INDIAN_NAME_REGEX.source, INDIAN_NAME_REGEX.flags);
  let nameMatch: RegExpExecArray | null;
  while ((nameMatch = nameRegex.exec(text)) !== null) {
    const firstName = nameMatch[1];
    const surname = nameMatch[2];
    const start = nameMatch.index;

    // Safety rule: Avoid matching the first word of a sentence unless it is in the names list
    if (isStartOfSentence(text, start)) {
      if (!INDIAN_NAMES_SET.has(firstName.toLowerCase())) {
        continue;
      }
    }

    if (isPlace(firstName)) {
      continue;
    }

    let value = firstName;
    let end = start + firstName.length;

    if (surname) {
      const lowerSur = surname.toLowerCase();
      if (
        !STOP_WORDS.has(lowerSur) &&
        !PLACE_STOPLIST.has(lowerSur) &&
        !NON_NAME_WORDS.has(lowerSur) &&
        !EXCLUDED_WORDS.has(lowerSur) &&
        /^[A-Z][a-z]+$/.test(surname)
      ) {
        value = `${firstName} ${surname}`;
        end = start + nameMatch[0].length;
      }
    }

    if (isPlace(value)) {
      continue;
    }

    candidates.push({
      type: 'person',
      value,
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
    if (isPlace(candidate.value) || PLACE_STOPLIST.has(candidate.value.toLowerCase())) {
      continue;
    }
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
