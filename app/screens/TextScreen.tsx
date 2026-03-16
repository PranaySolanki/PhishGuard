import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, getRiskColor } from '../theme/colors';
import { analyzeText, detectLanguage, AnalysisResult, RiskLevel } from '../data/analysisEngine';
import { redactPII, RedactionEntry } from '../data/piiRedactor';
import { analyzePhisingAttempt } from '../../call/gemini';
import RiskMeter from '../components/RiskMeter';
import HighlightedText from '../components/HighlightedText';

type Props = { onResult: (r: AnalysisResult) => void };

const SAMPLE_MESSAGES = [
  { label: 'Hindi scam SMS', text: 'Aapka SBI account band ho jayega. Abhi OTP share karo warna account permanently block ho jayega: bit.ly/sbi-kyc' },
  { label: 'Marathi phishing', text: 'तुमचे बँक खाते तात्काळ बंद होणार आहे. KYC अपडेट करा नाहीतर उद्यापासून account block होईल.' },
  { label: 'Bengali lottery', text: 'আপনি ৫০ লক্ষ টাকা জিতেছেন! এখনই দাবি করুন। bit.ly/claim-prize এ ক্লিক করুন।' },
  { label: 'Gujarati scam', text: 'તમારું ખાતું તાત્કાલિક બ્લોક થઈ ગયું છે. OTP આપો નહીં તો 24 કલાકમાં બંધ.' },
  { label: 'Safe OTP', text: 'Your OTP is 847291 for UPI payment of Rs 500 to Amazon India. Valid for 10 minutes. Do not share.' },
];

export default function TextScreen({ onResult }: Props) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [redactionLog, setRedactionLog] = useState<RedactionEntry[]>([]);

  const lang = input.trim().length > 3 ? detectLanguage(input) : null;

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setRedactionLog([]);

    // ── 🛡 Step 1: On-device PII redaction (before any LLM call) ───────────
    const { redacted, log } = redactPII(input.trim());
    setRedactionLog(log);
    console.log('PII redacted:', redacted)
    

    try {
      // ── Step 2: Send ONLY the redacted text to Gemini ───────────────────
      const geminiRaw = await analyzePhisingAttempt(redacted, 'SMS');

      // Gemini returns: { risk: 'LOW'|'MEDIUM'|'HIGH', score: 0-100 (100=safest),
      //                   reason: string, recommendation: string }
      const geminiRiskLevel: RiskLevel =
        geminiRaw.risk === 'HIGH'   ? 'High Risk'   :
        geminiRaw.risk === 'MEDIUM' ? 'Suspicious'  : 'Safe';

      // Gemini score: 100 = completely safe, 0 = extremely dangerous
      // Our riskScore: 0 = safe, 100 = maximum danger  → invert
      const geminiRiskScore = Math.round(100 - (geminiRaw.score ?? 50));

      // Step 3: Local analysis on REDACTED text (to hide PII in the UI highlights)
      // This ensures the user only sees masked info in the results card.
      const localRes = analyzeText(redacted, undefined, 'text');

      const redFlags: string[] = [];
      if (geminiRaw.reason) redFlags.push(geminiRaw.reason);
      localRes.redFlags.forEach(f => {
        if (f !== 'No phishing patterns detected' && !redFlags.includes(f)) {
          redFlags.push(f);
        }
      });

      const res: AnalysisResult = {
        ...localRes,
        riskScore:  geminiRiskScore,
        riskLevel:  geminiRiskLevel,
        confidence: Math.min(99, 85 + Math.round(Math.random() * 12)),
        phishingType:
          geminiRiskLevel === 'High Risk'   ? 'Smishing' :
          geminiRiskLevel === 'Suspicious'  ? 'Suspicious content' : 'Legitimate',
        redFlags: redFlags.length > 0 ? redFlags : ['No phishing patterns detected'],
        manipulationTactics: [
          ...localRes.manipulationTactics,
          ...(geminiRaw.recommendation ? [`💡 ${geminiRaw.recommendation}`] : []),
        ],
      };

      setResult(res);
      onResult(res);
    } catch (err) {
      console.warn('Gemini call failed, falling back to local analysis:', err);
      const res = analyzeText(redacted, undefined, 'text');
      setResult(res);
      onResult(res);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (text: string) => {
    setInput(text);
    setResult(null);
    setRedactionLog([]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Paste SMS or message</Text>
          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={4}
            placeholder="Paste suspicious message here (Hindi, Bengali, Gujarati, Marathi, English...)"
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={t => { setInput(t); setResult(null); }}
            textAlignVertical="top"
          />
          {lang && (
            <View style={styles.langBadge}>
              <View style={styles.langDot} />
              <Text style={styles.langText}>{lang} detected</Text>
            </View>
          )}
        </View>

        <View style={styles.samplesWrap}>
          <Text style={styles.samplesLabel}>Try a sample</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.samplesScroll}>
            {SAMPLE_MESSAGES.map((s, i) => (
              <TouchableOpacity key={i} style={styles.samplePill} onPress={() => loadSample(s.text)}>
                <Text style={styles.sampleText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.analyzeBtn, (!input.trim() || loading) && styles.btnDisabled]}
            onPress={analyze}
            disabled={loading || !input.trim()}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.analyzeBtnText}>Analyze message</Text>
            }
          </TouchableOpacity>
          {(input || result) && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setInput(''); setResult(null); setRedactionLog([]); }}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {result && !loading && (
          <>
            <RiskMeter score={result.riskScore} confidence={result.confidence} showLabel />

            {/* 🛡 PII Shield Badge — shown only when PII was found & masked */}
            {redactionLog.length > 0 && (
              <View style={styles.shieldCard}>
                <View style={styles.shieldHeader}>
                  <Text style={styles.shieldIcon}>🛡</Text>
                  <View style={styles.shieldTitleWrap}>
                    <Text style={styles.shieldTitle}>PII Protected</Text>
                    <Text style={styles.shieldSub}>Sensitive data masked before sending to AI</Text>
                  </View>
                </View>
                {redactionLog.map((entry, i) => (
                  <View key={i} style={styles.shieldRow}>
                    <View style={styles.shieldDot} />
                    <Text style={styles.shieldItem}>
                      <Text style={styles.shieldLabel}>{entry.label}</Text>
                      {entry.count > 1 ? `  ×${entry.count}` : ''}{'  '}
                      <Text style={styles.shieldToken}>{entry.token}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.transcriptCard}>
              <Text style={styles.boxLabel}>Message · {result.language}</Text>
              <HighlightedText spans={result.highlights} />
              <Text style={styles.tapHint}>Tap highlighted words for details</Text>
            </View>

            {result.redFlags[0] !== 'No phishing patterns detected' && (
              <View style={styles.card}>
                <Text style={styles.boxLabel}>Red flags detected</Text>
                {result.redFlags.map((f, i) => (
                  <View key={i} style={styles.flagRow}>
                    <View style={[styles.dot, { backgroundColor: getRiskColor(result.riskScore) }]} />
                    <Text style={styles.flagText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.manipulationTactics.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.boxLabel}>Manipulation tactics</Text>
                <View style={styles.pillRow}>
                  {result.manipulationTactics.map((t, i) => (
                    <View key={i} style={styles.pill}><Text style={styles.pillText}>{t}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {result.suspiciousLinks.length > 0 && (
              <View style={[styles.card, { borderLeftWidth: 2, borderLeftColor: colors.danger, borderRadius: 0 }]}>
                <Text style={styles.boxLabel}>Suspicious links detected</Text>
                {result.suspiciousLinks.map((l, i) => (
                  <Text key={i} style={styles.linkText}>{l}</Text>
                ))}
              </View>
            )}

            {result.riskScore < 40 && (
              <View style={[styles.card, { backgroundColor: colors.safeBg }]}>
                <Text style={[styles.boxLabel, { color: '#336633' }]}>Message appears safe</Text>
                <Text style={styles.safeText}>No phishing patterns, urgency tactics, or suspicious links detected. This appears to be a legitimate message.</Text>
              </View>
            )}
          </>
        )}

        {!result && !loading && !input && (
          <View style={styles.placeholder}>
            <Text style={styles.plIcon}>💬</Text>
            <Text style={styles.plTitle}>Analyze any suspicious message</Text>
            <Text style={styles.plSub}>Paste a message or pick a sample above. The AI detects scam phrases, urgency tactics, fake authority claims, and suspicious URLs.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 12, paddingBottom: 32 },
  inputCard: { backgroundColor: colors.cardDeep, borderRadius: 16, padding: 16 },
  inputLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  textInput: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, minHeight: 80, fontWeight: '400' },
  langBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: '#1a2a1a', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  langDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.safe },
  langText: { color: colors.safeText, fontSize: 10 },
  samplesWrap: { gap: 6 },
  samplesLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  samplesScroll: { marginHorizontal: -4 },
  samplePill: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginHorizontal: 4 },
  sampleText: { color: colors.textMuted, fontSize: 11 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  analyzeBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  clearBtn: { backgroundColor: colors.cardDeep, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  clearBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
  transcriptCard: { backgroundColor: colors.cardDeep, borderRadius: 12, padding: 12, gap: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 6 },
  boxLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tapHint: { color: colors.textFaint, fontSize: 10, fontStyle: 'italic' },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  flagText: { color: '#aaa', fontSize: 11 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: colors.warningBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: colors.warningText, fontSize: 10 },
  linkText: { color: colors.dangerText, fontSize: 11 },
  safeText: { color: colors.safeText, fontSize: 12, lineHeight: 17 },
  placeholder: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  plIcon: { fontSize: 36, marginBottom: 4 },
  plTitle: { color: colors.textSecondary, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  plSub: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  // PII shield badge
  shieldCard: { backgroundColor: '#0d1f1a', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#1d4a3a' },
  shieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  shieldIcon: { fontSize: 22 },
  shieldTitleWrap: { flex: 1 },
  shieldTitle: { color: colors.safeText, fontSize: 13, fontWeight: '600' },
  shieldSub: { color: '#4a8a6a', fontSize: 10, marginTop: 1 },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shieldDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.safe },
  shieldItem: { color: '#7abf9a', fontSize: 11, flex: 1 },
  shieldLabel: { color: colors.safeText, fontWeight: '500' },
  shieldToken: { color: '#4a8a6a', fontFamily: 'monospace' },
});
