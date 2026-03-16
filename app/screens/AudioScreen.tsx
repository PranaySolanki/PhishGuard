import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, getRiskColor, getRiskBg, getRiskText } from '../theme/colors';
import { analyzeText, AnalysisResult } from '../data/analysisEngine';
import RiskMeter from '../components/RiskMeter';
import HighlightedText from '../components/HighlightedText';

// Mock transcripts for demo — in real app replace with Whisper/STT
const MOCK_TRANSCRIPTS: Record<string, string> = {
  default_hi: 'Namaste, main RBI se bol raha hoon. Aapka account suspicious activity ke karan block ho sakta hai. Kripya abhi apna OTP batayein warna kal se transaction band ho jayegi.',
  default_mr: 'Tumche bank khate takaas band honar aahe. KYC update kara nahitar account block hoil. Aata link var click kara.',
  default_en: 'Hello, this is a call from your bank. Your account has been flagged for suspicious activity. Please share your OTP immediately to avoid account suspension.',
  default_safe: 'Your flight tomorrow is confirmed. Please arrive at the airport 2 hours before departure. Have a safe journey.',
};

type QueueItem = { uri: string; name: string; size?: number; status: 'pending' | 'processing' | 'done' | 'error'; result?: AnalysisResult };

type Props = { onResults: (results: AnalysisResult[]) => void };

export default function AudioScreen({ onResults }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);

  const pickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'application/octet-stream'],
        multiple: true,
        copyToCacheDirectory: false,
      });
      if (res.canceled) return;
      const newItems: QueueItem[] = res.assets.map((a: any) => ({
        uri: a.uri, name: a.name, size: a.size ?? undefined, status: 'pending',
      }));
      setQueue(q => [...q, ...newItems]);
    } catch {
      Alert.alert('Error', 'Could not pick files.');
    }
  };

  const analyzeAll = async () => {
    if (queue.length === 0) return;
    setProcessing(true);
    const results: AnalysisResult[] = [];

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done') continue;
      setQueue(q => q.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

      // Mock transcription — swap with real Whisper API call
      const transcriptKey = queue[i].name.includes('marathi') ? 'default_mr'
        : queue[i].name.includes('safe') ? 'default_safe'
        : queue[i].name.includes('en') ? 'default_en'
        : 'default_hi';
      const transcript = MOCK_TRANSCRIPTS[transcriptKey] ?? MOCK_TRANSCRIPTS['default_hi'];
      const result = analyzeText(transcript, queue[i].name, 'audio');
      result.transcript = transcript;
      results.push(result);

      setQueue(q => q.map((item, idx) => idx === i ? { ...item, status: 'done', result } : item));
    }

    setProcessing(false);
    onResults(results);
  };

  const removeItem = (i: number) => setQueue(q => q.filter((_, idx) => idx !== i));
  const clearAll = () => { setQueue([]); setSelectedResult(null); };

  const fmtSize = (bytes?: number) => bytes ? `${(bytes / 1024).toFixed(0)} KB` : '';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.dropzone} onPress={pickFiles}>
        <Text style={styles.dropIcon}>🎙</Text>
        <Text style={styles.dropTitle}>Upload audio files</Text>
        <Text style={styles.dropSub}>MP3, WAV, M4A, OGG · Multiple files supported</Text>
        <View style={styles.dropBtn}><Text style={styles.dropBtnText}>Choose files</Text></View>
      </TouchableOpacity>

      {queue.length > 0 && (
        <>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>{queue.length} file{queue.length !== 1 ? 's' : ''} queued</Text>
            <TouchableOpacity onPress={clearAll}><Text style={styles.clearText}>Clear all</Text></TouchableOpacity>
          </View>

          {queue.map((item, i) => (
            <View key={i} style={styles.queueItem}>
              <View style={styles.fileIcon}>
                <Text style={{ fontSize: 16 }}>
                  {item.status === 'done' && item.result
                    ? item.result.riskScore >= 70 ? '⚠' : item.result.riskScore >= 40 ? '!' : '✓'
                    : item.status === 'processing' ? '⟳' : '🎵'}
                </Text>
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.fileMeta}>
                  {fmtSize(item.size)}
                  {item.status === 'processing' && '  Transcribing...'}
                  {item.status === 'done' && item.result && `  ${item.result.language} · ${item.result.riskLevel}`}
                </Text>
              </View>
              {item.status === 'processing' && <ActivityIndicator size="small" color={colors.accentLight} />}
              {item.status === 'done' && item.result && (
                <TouchableOpacity onPress={() => setSelectedResult(
                  selectedResult?.id === item.result!.id ? null : item.result!
                )}>
                  <Text style={[styles.viewBtn, { color: getRiskColor(item.result.riskScore) }]}>
                    {selectedResult?.id === item.result.id ? 'Hide' : 'View'}
                  </Text>
                </TouchableOpacity>
              )}
              {item.status === 'pending' && (
                <TouchableOpacity onPress={() => removeItem(i)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {queue.some(q => q.status !== 'done') && (
            <TouchableOpacity
              style={[styles.analyzeBtn, processing && styles.analyzeBtnDisabled]}
              onPress={analyzeAll}
              disabled={processing}
            >
              {processing
                ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.analyzeBtnText}>  Analyzing...</Text></>
                : <Text style={styles.analyzeBtnText}>Analyze {queue.filter(q => q.status !== 'done').length} file{queue.filter(q => q.status !== 'done').length !== 1 ? 's' : ''}</Text>
              }
            </TouchableOpacity>
          )}
        </>
      )}

      {selectedResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{selectedResult.fileName}</Text>

          <RiskMeter score={selectedResult.riskScore} confidence={selectedResult.confidence} showLabel />

          {selectedResult.transcript && (
            <View style={styles.transcriptBox}>
              <Text style={styles.boxLabel}>Transcript · {selectedResult.language}</Text>
              <HighlightedText spans={selectedResult.highlights} />
            </View>
          )}

          {selectedResult.redFlags.length > 0 && selectedResult.redFlags[0] !== 'No phishing patterns detected' && (
            <View style={styles.flagsBox}>
              <Text style={styles.boxLabel}>Red flags</Text>
              {selectedResult.redFlags.map((f, i) => (
                <View key={i} style={styles.flagRow}>
                  <View style={[styles.flagDot, { backgroundColor: getRiskColor(selectedResult.riskScore) }]} />
                  <Text style={styles.flagText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {selectedResult.manipulationTactics.length > 0 && (
            <View style={styles.tacticsBox}>
              <Text style={styles.boxLabel}>Manipulation tactics</Text>
              <View style={styles.pillRow}>
                {selectedResult.manipulationTactics.map((t, i) => (
                  <View key={i} style={styles.pill}><Text style={styles.pillText}>{t}</Text></View>
                ))}
              </View>
            </View>
          )}

          {selectedResult.suspiciousLinks.length > 0 && (
            <View style={styles.linksBox}>
              <Text style={styles.boxLabel}>Suspicious links</Text>
              {selectedResult.suspiciousLinks.map((l, i) => (
                <Text key={i} style={styles.linkText}>{l}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {queue.length === 0 && (
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>How it works</Text>
          <Text style={styles.demoStep}>1. Upload one or more audio call recordings</Text>
          <Text style={styles.demoStep}>2. The app transcribes speech to text using on-device STT</Text>
          <Text style={styles.demoStep}>3. AI analyzes the transcript for scam patterns in Hindi, Bengali, Marathi, Gujarati &amp; English</Text>
          <Text style={styles.demoStep}>4. View risk score, highlighted phrases, and red flags</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  dropzone: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  dropIcon: { fontSize: 32, marginBottom: 4 },
  dropTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  dropSub: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  dropBtn: {
    marginTop: 8, backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 9,
  },
  dropBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueTitle: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  clearText: { color: colors.textFaint, fontSize: 11 },
  queueItem: {
    backgroundColor: colors.card, borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  fileIcon: {
    width: 36, height: 36, backgroundColor: '#1a1a2e', borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  fileInfo: { flex: 1 },
  fileName: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  fileMeta: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  viewBtn: { fontSize: 12, fontWeight: '500' },
  removeBtn: { color: colors.textFaint, fontSize: 14, padding: 4 },
  analyzeBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  resultCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 14 },
  resultTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  transcriptBox: { backgroundColor: colors.cardDeep, borderRadius: 10, padding: 12, gap: 8 },
  flagsBox: { gap: 6 },
  tacticsBox: { gap: 6 },
  linksBox: { gap: 4 },
  boxLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  flagDot: { width: 4, height: 4, borderRadius: 2 },
  flagText: { color: '#aaa', fontSize: 11 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: colors.warningBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: colors.warningText, fontSize: 10 },
  linkText: { color: colors.dangerText, fontSize: 11, fontFamily: 'monospace' },
  demoBox: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 8 },
  demoTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 4 },
  demoStep: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
