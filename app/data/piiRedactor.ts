

export type RedactionEntry = {
  /** Human-readable label shown to the user, e.g. "Credit card number" */
  label: string;
  /** The placeholder token injected into the sanitised string */
  token: string;
  /** How many times this pattern was redacted */
  count: number;
};

export type RedactionResult = {
  /** The sanitised text — safe to send to an LLM */
  redacted: string;
  /** What was found and removed — shown in the UI */
  log: RedactionEntry[];
  /** Convenience flag */
  hadPII: boolean;
};



const RULES: { label: string; token: string; pattern: RegExp }[] = [

  // ── Payment card numbers ────────────────────────────────────────────────
  // Matches 13-19 digit card numbers, optional spaces or hyphens between groups
  {
    label: 'Credit / debit card number',
    token: '[CARD_NUMBER]',
    pattern: /(?:\b|\s)(?:\p{Nd}[ \-]?){13,19}(?!\p{Nd})/gu,
  },

  // ── Indian Aadhaar (12 digits, often written as XXXX XXXX XXXX) ─────────
  {
    label: 'Aadhaar number',
    token: '[AADHAAR]',
    pattern: /(?:\b|\s)[2-9]\p{Nd}{3}[\s\-]?\p{Nd}{4}[\s\-]?\p{Nd}{4}(?!\p{Nd})/gu,
  },

  // ── PAN card (Indian tax ID: ABCDE1234F) ────────────────────────────────
  {
    label: 'PAN card number',
    token: '[PAN]',
    pattern: /\b[A-Za-z]{5}\p{Nd}{4}[A-Za-z](?!\p{Nd}|\p{L})/giu,
  },

  // ── CVV / CVC (3-4 digits near trigger words) ───────────────────────────
  {
    label: 'CVV / security code',
    token: '[CVV]',
    pattern: /(?:\b(?:cvv|cvc|security\s+code|card\s+verification)|सीवीवी|સીવીવી|সিভিভি)\s*(?:is|hai|chhe|:)?\s*\p{Nd}{3,4}(?!\p{Nd})/giu,
  },

  // ── UPI PIN (4-6 digits near UPI/pin keywords) ──────────────────────────
  {
    label: 'UPI PIN',
    token: '[UPI_PIN]',
    pattern: /(?:\b(?:upi|pin)|पिन|પિન|পিন)\s*(?:pin|number|no\.?|code|पिन|પિન|পিন)?\s*(?:is|hai|chhe|:)?\s*\p{Nd}{4,6}(?!\p{Nd})/giu,
  },

  // ── OTP/One-time passwords (4-8 digits near OTP keywords) ───────────────
  {
    label: 'OTP',
    token: '[OTP]',
    pattern: /(?:\b(?:otp|one[\s\-]?time\s+(?:password|code)|verification\s+code|passcode)|ओटीपी|ઓટીપી|ওটিপি)\s*(?:is|hai|chhe|:)?\s*\p{Nd}{4,8}(?!\p{Nd})/giu,
  },
  // Also Hindi / Marathi / Transliterated OTP contexts
  {
    label: 'OTP',
    token: '[OTP]',
    pattern: /(?:\botp|ओटीपी|ઓટીપી|ওটিপি)\s+(?:hai|share|batao|dena|do|chhe|aapo|dya|sanga|द्या|सांगा)\s*:?\s*\p{Nd}{4,8}(?!\p{Nd})/giu,
  },

  // ── Bank account numbers (9-18 digits — stand-alone, not part of card) ──
  // Applied AFTER card matching to avoid double-redaction.
  {
    label: 'Bank account number',
    token: '[ACCOUNT_NUMBER]',
    pattern: /(?:\b(?:account|a\/c|acct)|खाते|खाता|अकाउंट|ખાતું|એકાઉન્ટ|অ্যাকাউন্ট)[\s\-#]*(?:no\.?|number|num|नंबर|નંબર|নম্বর)?\s*:?\s*\p{Nd}{9,18}(?!\p{Nd})/giu,
  },

  // ── IFSC code (Indian bank branch routing) ──────────────────────────────
  {
    label: 'IFSC code',
    token: '[IFSC]',
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
  },

  // ── Indian mobile numbers (10 digits starting 6-9) ──────────────────────
  {
    label: 'Phone number',
    token: '[PHONE]',
    pattern: /(?:\b|\s)(?:\+91[\s\-]?)?[6-9]\p{Nd}{9}(?!\p{Nd})/gu,
  },

  // ── Email addresses ──────────────────────────────────────────────────────
  {
    label: 'Email address',
    token: '[EMAIL]',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  },

  // ── Passwords (near keyword, any non-space sequence) ────────────────────
  {
    label: 'Password',
    token: '[PASSWORD]',
    pattern: /(?:\b(?:password|passwd|pwd)|पासवर्ड|પાસવર્ડ|পাসওয়ার্ড)\s*(?:is|hai|chhe|:)?\s*\S+/gi,
  },
];

// ---------------------------------------------------------------------------
// Core redaction function
// ---------------------------------------------------------------------------

/**
 * Sanitise `text` by replacing all detected PII with labelled tokens.
 *
 * @param text  Raw text from Whisper / user input
 * @returns     { redacted, log, hadPII }
 */
export function redactPII(text: string): RedactionResult {
  let output = text;
  const log: RedactionEntry[] = [];

  for (const rule of RULES) {
    // Reset lastIndex for global regexes between calls
    rule.pattern.lastIndex = 0;

    const matches = output.match(rule.pattern);
    if (matches && matches.length > 0) {
      // Check if this label is already in the log (e.g. two OTP rules)
      const existing = log.find(e => e.label === rule.label);
      if (existing) {
        existing.count += matches.length;
      } else {
        log.push({ label: rule.label, token: rule.token, count: matches.length });
      }
      rule.pattern.lastIndex = 0;
      output = output.replace(rule.pattern, rule.token);
    }
    // Always reset after use
    rule.pattern.lastIndex = 0;
  }

  return {
    redacted: output,
    log,
    hadPII: log.length > 0,
  };
}

// Required by Expo Router — this file lives inside app/ but is not a route
export default function __route() { return null; }
