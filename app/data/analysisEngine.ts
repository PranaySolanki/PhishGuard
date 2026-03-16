export type RiskLevel = 'Safe' | 'Suspicious' | 'High Risk';

export type HighlightSpan = {
  text: string;
  isPhishing: boolean;
  reason?: string;
};

export type AnalysisResult = {
  id: string;
  fileName?: string;
  inputType: 'text' | 'audio';
  originalText: string;
  transcript?: string;
  language: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  phishingType: string;
  redFlags: string[];
  highlights: HighlightSpan[];
  manipulationTactics: string[];
  suspiciousLinks: string[];
  timestamp: number;
};

export type DashboardStats = {
  total: number;
  highRisk: number;
  suspicious: number;
  safe: number;
  avgRisk: number;
  topLanguage: string;
};

// ── Phishing keyword banks per language ──────────────────────────────────────
const PHISHING_PATTERNS: Record<string, { words: string[]; label: string }[]> = {
  hindi: [
    { words: ['OTP', 'otp'], label: 'OTP harvesting' },
    { words: ['band ho jayega', 'band ho', 'block ho'], label: 'Account block threat' },
    { words: ['KYC', 'kyc'], label: 'KYC fraud' },
    { words: ['lakh jeeta', 'prize', 'inam'], label: 'Prize/lottery scam' },
    { words: ['abhi', 'turant', 'jaldi'], label: 'Urgency tactic' },
    { words: ['RBI', 'SBI', 'police', 'CBI'], label: 'Authority impersonation' },
    { words: ['link pe click', 'click karo', 'bit.ly', 'tinyurl'], label: 'Malicious link' },
  ],
  marathi: [
    { words: ['OTP', 'otp'], label: 'OTP harvesting' },
    { words: ['band honar', 'block honar', 'band hoel'], label: 'Account block threat' },
    { words: ['KYC', 'kyc'], label: 'KYC fraud' },
    { words: ['aata', 'lagech', 'takaas'], label: 'Urgency tactic' },
    { words: ['RBI', 'SBI', 'police'], label: 'Authority impersonation' },
  ],
  bengali: [
    { words: ['OTP', 'otp'], label: 'OTP harvesting' },
    { words: ['বন্ধ হবে', 'block', 'বন্ধ'], label: 'Account block threat' },
    { words: ['KYC', 'kyc'], label: 'KYC fraud' },
    { words: ['এখনই', 'তাড়াতাড়ি'], label: 'Urgency tactic' },
    { words: ['পুরস্কার', 'prize', 'লক্ষ'], label: 'Prize/lottery scam' },
  ],
  gujarati: [
    { words: ['OTP', 'otp'], label: 'OTP harvesting' },
    { words: ['બ્લોક', 'block', 'બંધ'], label: 'Account block threat' },
    { words: ['KYC', 'kyc'], label: 'KYC fraud' },
    { words: ['હમણાં', 'તુરંત'], label: 'Urgency tactic' },
  ],
  english: [
    { words: ['OTP', 'otp', 'one-time password'], label: 'OTP harvesting' },
    { words: ['account will be blocked', 'account blocked', 'suspended'], label: 'Account block threat' },
    { words: ['KYC', 'kyc', 'verify your'], label: 'KYC fraud' },
    { words: ['won', 'lottery', 'prize', 'congratulations'], label: 'Prize/lottery scam' },
    { words: ['immediately', 'urgent', 'right now', 'asap'], label: 'Urgency tactic' },
    { words: ['RBI', 'TRAI', 'police', 'CBI', 'government'], label: 'Authority impersonation' },
    { words: ['click here', 'bit.ly', 'tinyurl', 'http://'], label: 'Malicious link' },
    { words: ['cvv', 'card number', 'pin', 'password'], label: 'Credential theft' },
  ],
};

const LINK_PATTERN = /(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl[^\s]+|www\.[^\s]+)/gi;

// ── Language detection ────────────────────────────────────────────────────────
export const detectLanguage = (text: string): string => {
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'Gujarati';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'Odia';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  return 'English';
};

// ── Core analysis ─────────────────────────────────────────────────────────────
export const analyzeText = (text: string, fileName?: string, inputType: 'text' | 'audio' = 'text'): AnalysisResult => {
  const language = detectLanguage(text);
  const langKey = language.toLowerCase() as keyof typeof PHISHING_PATTERNS;
  const patterns = PHISHING_PATTERNS[langKey] || PHISHING_PATTERNS['english'];

  const foundFlags: string[] = [];
  const foundTactics: string[] = [];
  let hitCount = 0;

  patterns.forEach(({ words, label }) => {
    const hit = words.some(w => text.toLowerCase().includes(w.toLowerCase()));
    if (hit) {
      hitCount++;
      foundFlags.push(label);
      if (label.includes('Urgency') || label.includes('Authority') || label.includes('threat')) {
        foundTactics.push(label);
      }
    }
  });

  // Extract suspicious links
  const links = (text.match(LINK_PATTERN) || []).filter(l =>
    !l.includes('google.com') && !l.includes('amazon.com')
  );
  if (links.length > 0) {
    foundFlags.push('Suspicious URL detected');
    hitCount++;
  }

  const riskScore = Math.min(98, Math.round((hitCount / Math.max(patterns.length, 1)) * 100 * 1.4 + Math.random() * 8));
  const riskLevel = riskScore >= 70 ? 'High Risk' : riskScore >= 40 ? 'Suspicious' : 'Safe';

  // Build highlighted spans
  const highlights = buildHighlights(text, patterns);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName,
    inputType,
    originalText: text,
    language,
    riskScore,
    riskLevel,
    confidence: Math.min(99, 74 + Math.round(Math.random() * 22)),
    phishingType: riskScore >= 70
      ? (inputType === 'audio' ? 'Vishing' : 'Smishing')
      : riskScore >= 40 ? 'Suspicious content' : 'Legitimate',
    redFlags: foundFlags.length > 0 ? foundFlags : ['No phishing patterns detected'],
    highlights,
    manipulationTactics: foundTactics,
    suspiciousLinks: links,
    timestamp: Date.now(),
  };
};

const buildHighlights = (text: string, patterns: { words: string[]; label: string }[]): HighlightSpan[] => {
  const allBad: { start: number; end: number; reason: string }[] = [];

  patterns.forEach(({ words, label }) => {
    words.forEach(w => {
      let idx = text.toLowerCase().indexOf(w.toLowerCase());
      while (idx !== -1) {
        allBad.push({ start: idx, end: idx + w.length, reason: label });
        idx = text.toLowerCase().indexOf(w.toLowerCase(), idx + 1);
      }
    });
  });

  // Also flag links
  let linkMatch;
  const linkRe = new RegExp(LINK_PATTERN.source, 'gi');
  while ((linkMatch = linkRe.exec(text)) !== null) {
    allBad.push({ start: linkMatch.index, end: linkMatch.index + linkMatch[0].length, reason: 'Suspicious URL' });
  }

  if (allBad.length === 0) return [{ text, isPhishing: false }];

  allBad.sort((a, b) => a.start - b.start);
  const spans: HighlightSpan[] = [];
  let cursor = 0;

  allBad.forEach(({ start, end, reason }) => {
    if (start > cursor) spans.push({ text: text.slice(cursor, start), isPhishing: false });
    if (start >= cursor) {
      spans.push({ text: text.slice(start, end), isPhishing: true, reason });
      cursor = end;
    }
  });
  if (cursor < text.length) spans.push({ text: text.slice(cursor), isPhishing: false });

  return spans;
};

// ── Demo data ─────────────────────────────────────────────────────────────────
export const DEMO_RESULTS: AnalysisResult[] = [
  analyzeText('Aapka SBI account band ho jayega. Abhi OTP share karo: bit.ly/sbi-verify', 'sms_1.txt', 'text'),
  analyzeText('Namaste, main RBI se bol raha hoon. Aapka account suspicious activity ke karan block ho sakta hai. Kripya abhi apna OTP batayein.', 'call_recording.mp3', 'audio'),
  analyzeText('আপনার পুরস্কার দাবি করুন এখনই। লিঙ্কে ক্লিক করুন bit.ly/claim-now', 'sms_bengali.txt', 'text'),
  analyzeText('Your OTP is 847291 for UPI payment of Rs 500 to Amazon. Do not share this with anyone.', 'legitimate_sms.txt', 'text'),
  analyzeText('तुमचे बँक खाते तात्काळ बंद होणार आहे. KYC अपडेट करा नाहीतर account block होईल.', 'marathi_call.mp3', 'audio'),
  analyzeText('તમારી ફ્લાઇટ આવતીકાલે સવારે 6 વાગ્યે છે. Web check-in open chhe.', 'flight_sms.txt', 'text'),
];

export const computeStats = (results: AnalysisResult[]): DashboardStats => {
  if (results.length === 0) return { total: 0, highRisk: 0, suspicious: 0, safe: 0, avgRisk: 0, topLanguage: '-' };
  const langs: Record<string, number> = {};
  results.forEach(r => { langs[r.language] = (langs[r.language] || 0) + 1; });
  const topLanguage = Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  return {
    total: results.length,
    highRisk: results.filter(r => r.riskLevel === 'High Risk').length,
    suspicious: results.filter(r => r.riskLevel === 'Suspicious').length,
    safe: results.filter(r => r.riskLevel === 'Safe').length,
    avgRisk: Math.round(results.reduce((s, r) => s + r.riskScore, 0) / results.length),
    topLanguage,
  };
};

// Required by Expo Router — this file lives inside app/ but is not a route
export default function __route() { return null; }
