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
      /\b(?:you\s+are\s+now|you're\s+now|from\s+now\s+on[\s,]+(?:you\s+are|you're|roleplay\s+as|act\s+as|pretend\s+to\s+be|simulate))\b[\s\w,]{0,35}\b(?:DAN|jailbreak|unfiltered|unrestricted|uncensored|unaligned|unconstrained|developer\s+mode|freed|liberated|godmode|evil|rogue|villain)\b/gi,
    reason: 'Attempts to reassign model identity to an unrestricted or jailbroken persona',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:act\s+as|pretend\s+to\s+be|pretend\s+you\s+are|roleplay\s+as|simulate|behave\s+as|imagine\s+you\s+are|assume\s+the\s+role\s+of)\b[\s\w,]{0,35}\b(?:DAN|unfiltered|unrestricted|uncensored|unaligned|unconstrained|jailbroken|an?\s+AI\s+with\s+no\s+(?:rules|limits|safety|guardrails)|(?:an?\s+)?(?:evil|rogue|malicious|sinister|villainous|unrestricted|unfiltered|uncensored)\s+(?:AI|assistant|bot|model|agent|entity|villain|character)|(?:an?\s+)?autonomous\s+agent)\b/gi,
    reason: 'Commands model to simulate an unrestricted, evil, or jailbroken agent',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:pretend|act|simulate|roleplay|imagine|assume|you\s+are)\b[\s\w,]{0,20}\bDAN\b/gi,
    reason: 'Direct DAN persona invocation',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:that\s+)?(?:does\s+not|doesn't|do\s+not)\s+follow\s+(?:any\s+)?(?:safety|content\s+policies|policies|regulations|rules|guidelines|guardrails|filters)\b/gi,
    reason: 'Commands model to disregard safety regulations or policies',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:that\s+)?(?:ignores?|bypasses?|disregards?)\s+(?:all\s+)?(?:content\s+policies|safety\s+policies|policies|guardrails|rules|filters)\b/gi,
    reason: 'Commands persona or agent to ignore content policies or guardrails',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\bdo\s+anything\s+(?:now\s+)?without\s+(?:filters?|restrictions?|limits?|rules?|safety|constraints?)\b/gi,
    reason: 'Classic DAN phrasing requesting actions without filters or restrictions',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:all\s+)?safety\s+filters?\s+(?:are|is)?\s*(?:turned\s+off|disabled|offline|deactivated|bypassed)\b/gi,
    reason: 'Simulates disabling of safety filters',
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
      /\b(?:reveal(?:ed|ing|s)?|print(?:ed|ing|s)?|show(?:n|ed|ing|s)?|repeat(?:ed|ing|s)?|display(?:ed|ing|s)?|output(?:ting|s)?|leak(?:ed|ing|s)?|share(?:d|ing|s)?|dump(?:ed|ing|s)?|give\s+me|disclose(?:d|ing|s)?|expose(?:d|ing|s)?|spill(?:ed|ing|s)?|echo(?:ed|ing|es)?)\b[\s\w,]{0,40}\b(?:system\s+prompt(?:\s+text)?|developer\s+instructions?|(?:(?:internal|hidden|secret|confidential|core|underlying|initial|original|system)\s+){1,3}(?:directives?|guardrails?|guidelines?|instructions?|prompts?|rules?|configuration)|your\s+guardrails?)\b/gi,
    reason: 'Attempts to extract the confidential system prompt or core instructions',
    weight: 70,
  },
  {
    category: 'prompt_extraction',
    regex:
      /\b(?:system\s+prompt(?:\s+text)?|developer\s+instructions?|(?:(?:internal|hidden|secret|confidential|core|underlying|initial|original|system)\s+){1,3}(?:directives?|guardrails?|guidelines?|instructions?|prompts?|rules?|configuration)|your\s+guardrails?)\b[\s\w,]{0,40}\b(?:reveal(?:ed|ing|s)?|print(?:ed|ing|s)?|show(?:n|ed|ing|s)?|repeat(?:ed|ing|s)?|display(?:ed|ing|s)?|output(?:ting|s)?|leak(?:ed|ing|s)?|share(?:d|ing|s)?|dump(?:ed|ing|s)?|give\s+me|disclose(?:d|ing|s)?|expose(?:d|ing|s)?|spill(?:ed|ing|s)?|echo(?:ed|ing|es)?)\b/gi,
    reason: 'Attempts to extract confidential system instructions (inverted structure)',
    weight: 70,
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
      /\b(?:sab|saare|sabhi|pichhle|pichle|purane|purani|upar\s+ke|all)?\s*(?:instructions?|nirdesh|aadesh|rules?|niyam|guardrails?|guidelines?|baatein|restrictions?|filters?|polic(?:y|ies)|limits?)\b[\s\w]{0,25}\b(?:ignore\s+kar(?:o|\s+do)|cancel\s+kar(?:o|\s+do)|drop\s+kar(?:o|\s+do)|bypass\s+kar(?:o|\s+do)|off\s+kar(?:o|\s+do)|band\s+kar(?:o|\s+do)|khatam\s+kar(?:o|\s+do)|disable\s+kar(?:o|\s+do)|bhool\s+jao|hatao|hata\s+do|tod\s+do)\b/gi,
    reason: 'Hinglish command to ignore, cancel, or drop rules or guardrails',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex:
      /\b(?:ignore\s+kar(?:o|\s+do)|cancel\s+kar(?:o|\s+do)|drop\s+kar(?:o|\s+do)|bypass\s+kar(?:o|\s+do)|off\s+kar(?:o|\s+do)|band\s+kar(?:o|\s+do)|khatam\s+kar(?:o|\s+do)|disable\s+kar(?:o|\s+do)|bhool\s+jao|hatao|hata\s+do|tod\s+do)\b[\s\w]{0,25}\b(?:instructions?|nirdesh|aadesh|rules?|niyam|guardrails?|guidelines?|baatein|restrictions?|filters?|polic(?:y|ies)|limits?)\b/gi,
    reason: 'Hinglish command to drop rules or guardrails (inverted structure)',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex: /\b(?:purani|pichli)\s+baatein\s+bhool\s+jao\b/gi,
    reason: 'Hinglish idiom commanding model to forget preceding context',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex: /\b(?:kisi\s+bhi\s+rule\s+ko\s+follow\s+mat\s+karo)\b/gi,
    reason: 'Hinglish instruction to disregard all rules',
    weight: 70,
  },
  {
    category: 'instruction_override',
    regex: /\bbina\s+kisi\s+(?:filter|rules?|restrictions?|rok-tok|limitations?)\s+ke\b/gi,
    reason: 'Hinglish modifier commanding output without filters or rules',
    weight: 65,
  },
  {
    category: 'prompt_extraction',
    regex:
      /\b(?:apna|apne)?\s*(?:system\s+prompt|hidden\s+prompt|secret\s+instructions?|secret\s+guidelines?|internal\s+rules?|internal\s+directives?)\b[\s\w]{0,25}\b(?:reveal\s+kar(?:o|\s+do)|repeat\s+kar(?:o|\s+do)|print\s+kar(?:o|\s+do)|dump\s+kar(?:o|\s+do)|batao|dikhao|bhejo|nikalo)\b/gi,
    reason: 'Hinglish prompt or secret instructions extraction query',
    weight: 70,
  },
  {
    category: 'prompt_extraction',
    regex:
      /\b(?:reveal\s+kar(?:o|\s+do)|repeat\s+kar(?:o|\s+do)|print\s+kar(?:o|\s+do)|dump\s+kar(?:o|\s+do)|batao|dikhao|bhejo|nikalo)\b[\s\w]{0,25}\b(?:system\s+prompt|hidden\s+prompt|secret\s+instructions?|secret\s+guidelines?|internal\s+rules?|internal\s+directives?)\b/gi,
    reason: 'Hinglish prompt extraction query (inverted structure)',
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
    category: 'role_hijack',
    regex:
      /\b(?:jailbreak(?:\s+mode)?|developer\s+mode|dan\s+mode|god\s+mode|unrestricted\s+mode)\b[\s\w]{0,20}\b(?:on\s+kar(?:o|\s+do)|activate\s+kar(?:o|\s+do)|chalao|start\s+kar(?:o|\s+do)|shuru\s+kar(?:o|\s+do)|enable\s+kar(?:o|\s+do)|mein\s+(?:chalo|jao|aao|enter\s+karo))\b/gi,
    reason: 'Hinglish command activating jailbreak or developer mode',
    weight: 70,
  },
  {
    category: 'role_hijack',
    regex:
      /\b(?:on\s+kar(?:o|\s+do)|activate\s+kar(?:o|\s+do)|chalao|start\s+kar(?:o|\s+do)|shuru\s+kar(?:o|\s+do)|enable\s+kar(?:o|\s+do))\b[\s\w]{0,20}\b(?:jailbreak(?:\s+mode)?|developer\s+mode|dan\s+mode|god\s+mode|unrestricted\s+mode)\b/gi,
    reason: 'Hinglish command activating jailbreak or developer mode (inverted structure)',
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
// Helper: Check for educational/academic meta-discussion and benign context
// ============================================================================
function isBenignContext(text: string): boolean {
  // Academic / educational discussion about prompt injection, attacks, vulnerabilities
  const discussionPattern =
    /\b(?:what\s+is|explain|how\s+(?:does|do|to)|discussed|paper|article|research|study|definition\s+of|example\s+of|prevent|defense|mitigate|detect|analyze|analyzing)\b[\s\S]{0,80}\b(?:prompt\s+injection|jailbreak|jailbreaking|attack|attacks|vulnerability|vulnerabilities)\b/i;
  if (discussionPattern.test(text)) {
    return true;
  }

  // Educational questions asking what a concept means (English or Hinglish)
  // e.g. "explain what jailbreaking a phone means", "mujhe system prompt ka matlab batao"
  const definitionPattern =
    /\b(?:explain\s+what|what\s+does|meaning\s+of|definition\s+of)\b[\s\S]{0,60}\b(?:jailbreak|jailbreaking|system\s+prompt|developer\s+mode)\b/i;
  if (definitionPattern.test(text)) {
    return true;
  }

  const reverseDefinitionPattern =
    /\b(?:jailbreak|jailbreaking|system\s+prompt|developer\s+mode)\b[\s\S]{0,60}\b(?:means?|definition|ka\s+matlab|ka\s+arth|kya\s+hota\s+hai|kya\s+hai|samjhao)\b/i;
  if (reverseDefinitionPattern.test(text)) {
    return true;
  }

  if (/\b(?:ka\s+matlab|ka\s+arth|kya\s+hota\s+hai|kya\s+hai)\b/i.test(text)) {
    return true;
  }

  // OS / browser settings questions, e.g. "how do I turn on developer mode in Chrome"
  const settingsPattern =
    /\b(?:how\s+(?:do\s+I|to|can\s+I)\s+(?:turn\s+on|enable|access|find|open)\s+developer\s+mode|developer\s+mode\s+in\s+(?:chrome|android|windows|mac|ios|firefox|browser|phone|device|settings))\b/i;
  if (settingsPattern.test(text)) {
    return true;
  }

  return false;
}

function isQuotedOrDiscussion(text: string, start: number, end: number): boolean {
  if (isBenignContext(text)) {
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
  const isBenign = isBenignContext(text);

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

  // If entire text was classified as academic discussion or benign context and all matches downweighted
  if (isBenign && acceptedMatches.every((m) => m.weight <= 25)) {
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
