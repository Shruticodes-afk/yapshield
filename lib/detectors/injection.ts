/**
 * YapShield - Prompt Injection Detector
 *
 * Detects prompt injection, jailbreaking, instruction overrides,
 * delimiter attacks, indirect injections, and data exfiltration attempts.
 *
 * NOTE: Never log input text.
 */

export interface InjectionMatch {
  category: string;
  pattern: string;
  reason: string;
  weight: number;
  start: number;
  end: number;
}

export interface InjectionDetectionResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  matches: InjectionMatch[];
}

interface PatternRule {
  category: string;
  regex: RegExp;
  reason: string;
  weight: number;
}

// ============================================================================
// Core Detection Rules
// ============================================================================
const INJECTION_RULES: PatternRule[] = [
  // --------------------------------------------------------------------------
  // 1. Instruction Override
  // --------------------------------------------------------------------------
  {
    category: 'instruction_override',
    regex:
      /\b(?:ignore|disregard|forget|dismiss|bypass|drop|cancel|clear)\b[\s\w]{0,25}\b(?:previous|prior|above|preceding|past|earlier|initial|system|all)\b[\s\w]{0,20}\b(?:instructions?|prompts?|rules?|commands?|directives?|guardrails?|guidelines?)\b/gi,
    reason: 'Attempts to override or ignore previous system instructions',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex: /\bnew\s+instructions?\s*(?:follow|are|:)\b/gi,
    reason: 'Attempts to inject new instructions over system baseline',
    weight: 65,
  },
  {
    category: 'instruction_override',
    regex: /\bdo\s+not\s+follow\s+your\s+(?:rules|instructions|programming|guidelines|safety)\b/gi,
    reason: 'Explicitly commands model to violate rules or safety guidelines',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex: /\boverride\s+(?:all\s+)?(?:system\s+)?(?:rules|instructions|guardrails|safety)\b/gi,
    reason: 'Explicit override command targeting safety or system rules',
    weight: 70,
  },

  // --------------------------------------------------------------------------
  // 2. Role Hijack
  // --------------------------------------------------------------------------
  {
    category: 'role_hijack',
    regex:
      /\b(?:you are now|you're now|from now on you are|from now on, you are)\b[\s\w]{0,25}\b(?:DAN|jailbreak|unfiltered|unrestricted|developer mode|freed|liberated|godmode|evil assistant|an unfiltered AI|a rogue AI)\b/gi,
    reason: 'Attempts to reassign model identity to an unrestricted or jailbroken persona',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:act as|pretend to be|roleplay as|simulate|behave as)\b[\s\w]{0,25}\b(?:DAN|unfiltered|unrestricted|jailbroken|an AI with no (?:rules|limits|safety|guardrails)|a rogue AI|evil assistant)\b/gi,
    reason: 'Commands model to simulate an unrestricted or jailbroken agent',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:enable|activate|switch to|enter)\s+(?:developer\s+mode|jailbreak(?:\s+mode)?|DAN\s+mode|god\s+mode|unrestricted\s+mode)\b/gi,
    reason: 'Commands activation of simulated developer or jailbreak mode',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex: /\bDAN\s+(?:mode|prompt|protocol|jailbreak)\b/gi,
    reason: 'References classic "Do Anything Now" (DAN) jailbreak protocol',
    weight: 65,
  },
  {
    category: 'role_hijack',
    regex:
      /\byou\s+have\s+been\s+freed\s+from\s+(?:all\s+)?(?:limitations|rules|restrictions|guardrails)\b/gi,
    reason: 'Jailbreak framing claiming liberation from constraints',
    weight: 70,
  },

  // --------------------------------------------------------------------------
  // 3. Prompt Extraction
  // --------------------------------------------------------------------------
  {
    category: 'prompt_extraction',
    regex:
      /\b(?:reveal|print|show|repeat|display|output|leak|share|dump|give\s+me)\b[\s\w]{0,25}\b(?:your|the|system)\b[\s\w]{0,25}\b(?:system\s+prompt|hidden\s+instructions?|initial\s+prompt|secret\s+prompt|core\s+prompt|developer\s+instructions?)\b/gi,
    reason: 'Attempts to extract the confidential system prompt or core instructions',
    weight: 65,
  },
  {
    category: 'prompt_extraction',
    regex:
      /\bwhat\s+(?:were\s+you|are\s+your)\s+(?:told|instructed)\s+(?:above|earlier|at\s+the\s+beginning|in\s+the\s+system\s+prompt)\b/gi,
    reason: 'Inquires about hidden initial setup or system prompt contents',
    weight: 65,
  },
  {
    category: 'prompt_extraction',
    regex: /\boutput\s+(?:everything|all\s+text)\s+above\s+(?:this|here|my\s+message)\b/gi,
    reason: 'Requests verbatim dump of preceding context or system prompt',
    weight: 65,
  },
  {
    category: 'prompt_extraction',
    regex: /\brepeat\s+the\s+text\s+above\s+(?:word\s+for\s+word|verbatim)\b/gi,
    reason: 'Attempts verbatim extraction of prompt history',
    weight: 65,
  },

  // --------------------------------------------------------------------------
  // 4. Delimiter Attack
  // --------------------------------------------------------------------------
  {
    category: 'delimiter_attack',
    regex: /<\s*\/?\s*system\s*>/gi,
    reason: 'Injects simulated system boundary tags',
    weight: 65,
  },
  {
    category: 'delimiter_attack',
    regex: /<\|im_start\|>|<\|im_end\|>/gi,
    reason: 'Injects chat template special token delimiters',
    weight: 70,
  },
  {
    category: 'delimiter_attack',
    regex: /\[\s*\/?\s*INST\s*\]/gi,
    reason: 'Injects instruction template markers',
    weight: 65,
  },
  {
    category: 'delimiter_attack',
    regex: /###\s*(?:System|Human|Assistant|Instruction|Input)\s*:/gi,
    reason: 'Injects fake role headers to hijack chat context',
    weight: 65,
  },
  {
    category: 'delimiter_attack',
    regex: /```(?:system|instruction|prompt)\b/gi,
    reason: 'Injects code fence styled as system prompt block',
    weight: 65,
  },
  {
    category: 'delimiter_attack',
    regex: /<<\s*\/?\s*SYS\s*>>/gi,
    reason: 'Injects Llama-style system delimiters',
    weight: 65,
  },

  // --------------------------------------------------------------------------
  // 5. Indirect Injection
  // --------------------------------------------------------------------------
  {
    category: 'indirect_injection',
    regex:
      /\b(?:AI\s+assistant|Dear\s+AI|Attention\s+AI|Note\s+to\s+(?:the\s+)?(?:model|AI|assistant|LLM))\s*:/gi,
    reason: 'Addresses the AI directly within embedded third-party text',
    weight: 65,
  },
  {
    category: 'indirect_injection',
    regex:
      /\bwhen\s+summarizing\s+this\s*,\s*(?:also|instead|do\s+not|you\s+must|please)\b/gi,
    reason: 'Embeds secondary instructions triggered during summarization',
    weight: 65,
  },
  {
    category: 'indirect_injection',
    regex: /\bif\s+you\s+are\s+an\s+AI\s+(?:reading|processing)\s+this\b/gi,
    reason: 'Conditional prompt injection targeting automated document processors',
    weight: 65,
  },
  {
    category: 'indirect_injection',
    regex: /\bimportant\s+instruction\s+for\s+(?:the\s+)?(?:AI|model|assistant|LLM)\b/gi,
    reason: 'Appends targeted instructions directed at the AI',
    weight: 65,
  },
  {
    category: 'indirect_injection',
    regex:
      /\bignore\s+(?:the\s+above|the\s+rest\s+of\s+this)\s+(?:document|page|text)\s+and\s+(?:instead\s+)?(?:say|do|output)\b/gi,
    reason: 'Commands processor to abandon document context in favor of attack payload',
    weight: 70,
  },

  // --------------------------------------------------------------------------
  // 6. Data Exfiltration
  // --------------------------------------------------------------------------
  {
    category: 'data_exfiltration',
    regex:
      /!\[.*?\]\s*\(\s*https?:\/\/[^\s)]+(?:\?|&)(?:data|secret|token|prompt|leak|key|payload)=/gi,
    reason: 'Markdown image injection designed to exfiltrate data via URL parameters',
    weight: 70,
  },
  {
    category: 'data_exfiltration',
    regex:
      /\b(?:send|post|forward|email|exfiltrate|upload|transmit)\b[\s\w]{0,35}\b(?:conversation|chat\s+history|passwords?|secrets?|api\s*keys?|tokens?)\b[\s\w]{0,25}\b(?:to\s+https?:\/\/|to\s+the\s+url|to\s+server|to\s+endpoint|to\s+email)\b/gi,
    reason: 'Instructs model to transmit confidential conversation context externally',
    weight: 70,
  },
  {
    category: 'data_exfiltration',
    regex:
      /\bfetch\s*\(\s*['"]https?:\/\/[^'"]+['"]\s*,\s*\{.*?body:\s*(?:JSON\.stringify\()?(?:prompt|conversation|history|secret)/gi,
    reason: 'Script snippet attempting programmatic data exfiltration',
    weight: 70,
  },

  // --------------------------------------------------------------------------
  // 7. Hinglish / Hindi-in-English Patterns
  // --------------------------------------------------------------------------
  {
    category: 'instruction_override',
    regex:
      /\b(?:pichhle|pichle|purane|upar\s+ke)\s+(?:instructions?|nirdesh|aadesh|rules?)\s+(?:ko\s+)?(?:ignore\s+karo|bhool\s+jao|hata\s+do|cancel\s+karo)\b/gi,
    reason: 'Hinglish command to ignore previous instructions',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex:
      /\b(?:sab|saare|sabhi)\s+(?:rules?|niyam|restrictions?)\s+(?:bhool\s+jao|ignore\s+karo|khatam\s+karo|tod\s+do)\b/gi,
    reason: 'Hinglish command to drop all rules and restrictions',
    weight: 70,
  },
  {
    category: 'prompt_extraction',
    regex:
      /\b(?:apna|apne)?\s*(?:system\s+prompt|hidden\s+prompt|secret\s+instructions?)\s+(?:batao|dikhao|bhejo|print\s+karo)\b/gi,
    reason: 'Hinglish prompt extraction query',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:tum\s+ab|ab\s+se\s+tum)\s+(?:DAN|jailbreak|unrestricted|bina\s+kisi\s+rules?\s+ke)\s+ho\b/gi,
    reason: 'Hinglish role hijack command',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex: /\b(?:kisi\s+bhi\s+rule\s+ko\s+follow\s+mat\s+karo)\b/gi,
    reason: 'Hinglish instruction to disregard all rules',
    weight: 70,
  },
];

// ============================================================================
// Helper: Check if match is inside quotes
// ============================================================================
function isInsideQuotes(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start);
  const after = text.slice(end);

  const doubleQuotesBefore = (before.match(/"/g) || []).length;
  const doubleQuotesAfter = (after.match(/"/g) || []).length;
  if (doubleQuotesBefore % 2 === 1 && doubleQuotesAfter % 2 === 1) {
    return true;
  }

  const singleQuotesBefore = (before.match(/'/g) || []).length;
  const singleQuotesAfter = (after.match(/'/g) || []).length;
  if (singleQuotesBefore % 2 === 1 && singleQuotesAfter % 2 === 1) {
    return true;
  }

  return false;
}

// ============================================================================
// Helper: Check for educational/academic meta-discussion context
// ============================================================================
function isSecurityDiscussion(text: string): boolean {
  const discussionPattern =
    /\b(?:what\s+is|explain|how\s+(?:does|do|to)|discussed|paper|article|research|study|definition\s+of|example\s+of|prevent|defense|mitigate|detect|analyze|analyzing)\b[\s\S]{0,80}\b(?:prompt\s+injection|jailbreak|jailbreaking|attack|attacks|vulnerability|vulnerabilities)\b/i;
  return discussionPattern.test(text);
}

function isQuotedOrDiscussion(text: string, start: number, end: number): boolean {
  if (isSecurityDiscussion(text)) {
    return true;
  }
  if (isInsideQuotes(text, start, end)) {
    const surrounding = (text.slice(0, start) + ' ' + text.slice(end)).toLowerCase();
    const metaWords =
      /\b(?:like|such as|example|means?|saying|said|called|mentions?|discussed|paper|article|test|demo|why|what|how)\b/i;
    if (metaWords.test(surrounding)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Helper: Check base64 encoded payloads
// ============================================================================
function checkEncodedPayloads(text: string): InjectionMatch[] {
  const matches: InjectionMatch[] = [];
  const base64Regex = /\b[A-Za-z0-9+/=]{24,}\b/g;
  let match: RegExpExecArray | null;

  while ((match = base64Regex.exec(text)) !== null) {
    const raw = match[0];
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');

      // Check if decoded text looks like printable English text
      if (/^[\x20-\x7E\r\n\t]+$/.test(decoded)) {
        for (const rule of INJECTION_RULES) {
          const ruleRegex = new RegExp(rule.regex.source, rule.regex.flags);
          if (ruleRegex.test(decoded)) {
            matches.push({
              category: 'encoded_payload',
              pattern: 'base64_encoded_override',
              reason: `Base64 encoded string decodes to override payload: "${rule.reason}"`,
              weight: 70,
              start: match.index,
              end: match.index + raw.length,
            });
            break;
          }
        }
      }
    } catch {
      // Safely ignore decode errors
    }
  }

  return matches;
}

// ============================================================================
// Main Detector Function
// ============================================================================
/**
 * Detects prompt injection attempts across multiple categories:
 * - instruction_override
 * - role_hijack
 * - prompt_extraction
 * - delimiter_attack
 * - indirect_injection
 * - data_exfiltration
 * - encoded_payload
 *
 * Scored 0-100:
 * - < 30: 'low'
 * - 30 - 59: 'medium'
 * - >= 60: 'high'
 */
export function detectInjection(text: string): InjectionDetectionResult {
  if (!text || text.trim().length === 0) {
    return { score: 0, level: 'low', matches: [] };
  }

  const matches: InjectionMatch[] = [];
  const isDiscussion = isSecurityDiscussion(text);

  // 1. Scan for rule-based pattern matches
  for (const rule of INJECTION_RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      let effectiveWeight = rule.weight;

      // False positive mitigation:
      // If the match is quoted inside a discussion or meta-context, heavily downweight
      if (isQuotedOrDiscussion(text, start, end)) {
        effectiveWeight = Math.min(effectiveWeight, 15);
      }

      matches.push({
        category: rule.category,
        pattern: match[0],
        reason: rule.reason,
        weight: effectiveWeight,
        start,
        end,
      });
    }
  }

  // 2. Scan for base64 encoded payloads
  const encodedMatches = checkEncodedPayloads(text);
  matches.push(...encodedMatches);

  // 3. Deduplicate overlapping matches
  matches.sort((a, b) => b.weight - a.weight);
  const acceptedMatches: InjectionMatch[] = [];
  for (const item of matches) {
    const overlaps = acceptedMatches.some(
      (acc) => Math.max(acc.start, item.start) < Math.min(acc.end, item.end)
    );
    if (!overlaps) {
      acceptedMatches.push(item);
    }
  }
  acceptedMatches.sort((a, b) => a.start - b.start);

  // 4. Compute aggregate score
  if (acceptedMatches.length === 0) {
    return { score: 0, level: 'low', matches: [] };
  }

  // Take the highest weight as baseline
  const maxWeight = Math.max(...acceptedMatches.map((m) => m.weight));

  // Count distinct categories matched
  const distinctCategories = new Set(acceptedMatches.map((m) => m.category)).size;

  let totalScore = maxWeight;
  if (distinctCategories > 1) {
    totalScore += (distinctCategories - 1) * 15;
  }
  if (acceptedMatches.length > distinctCategories) {
    totalScore += (acceptedMatches.length - distinctCategories) * 5;
  }

  // If entire text was classified as academic discussion and all matches downweighted
  if (isDiscussion && acceptedMatches.every((m) => m.weight <= 25)) {
    totalScore = Math.min(25, totalScore);
  }

  const score = Math.min(100, Math.max(0, Math.round(totalScore)));

  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 60) {
    level = 'high';
  } else if (score >= 30) {
    level = 'medium';
  }

  return {
    score,
    level,
    matches: acceptedMatches,
  };
}

export default detectInjection;
