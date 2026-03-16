import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated,
} from 'react-native';
import { colors } from '../theme/colors';
import RiskMeter from '../components/RiskMeter';
import { useWhisperTranscription } from '../whisper/useWhisperTranscription';

const WaveBar = ({ recording }: { recording: boolean }) => {
  const anim = React.useRef(new Animated.Value(6)).current;

  React.useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 6 + Math.random() * 18,
            duration: 250 + Math.random() * 200,
            useNativeDriver: false,
          }),
          Animated.timing(anim, { toValue: 6, duration: 250, useNativeDriver: false }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
      Animated.timing(anim, { toValue: 6, duration: 200, useNativeDriver: false }).start();
    }
  }, [recording]);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        { height: anim, backgroundColor: recording ? colors.danger : colors.textFaint },
      ]}
    />
  );
};

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceScreen() {
  const {
    isRecording, isModelReady, segments, riskScore,
    seconds, startRecording, stopRecording, reset,
  } = useWhisperTranscription();

  const isDone = !isRecording && segments.length > 0;

  const redFlags = riskScore >= 70
    ? ['Phishing keywords detected', 'Urgency language found', 'Possible impersonation']
    : riskScore >= 40
    ? ['Suspicious keywords present']
    : [];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      <View style={styles.voiceCard}>
        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!isModelReady && !isRecording}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <View style={styles.micWrap}>
              <View style={styles.micBody} />
              <View style={styles.micStand} />
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.recLabel, isRecording && { color: colors.danger }]}>
          {!isModelReady
            ? 'Loading model...'
            : isRecording
            ? `Recording... ${formatTime(seconds)}`
            : isDone
            ? 'Recording complete'
            : 'Tap to start recording'}
        </Text>

        <View style={styles.wave}>
          {[...Array(7)].map((_, i) => (
            <WaveBar key={i} recording={isRecording} />
          ))}
        </View>
      </View>

      {segments.length > 0 && (
        <View style={styles.transcriptCard}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptLabel}>Live transcript</Text>
            {isRecording && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}
          </View>
          <Text style={styles.transcriptBody}>
            {segments.map((seg, i) => (
              <Text
                key={i}
                style={seg.isPhishing ? styles.highlightWord : styles.normalWord}
              >
                {seg.wasRedacted ? '🛡' : ''}{seg.text}{' '}
              </Text>
            ))}
          </Text>
        </View>
      )}

      {riskScore > 0 && (
        <RiskMeter
          score={riskScore}
          confidence={92}
        />
      )}

      {riskScore >= 80 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertTitle}>End this call immediately</Text>
          <Text style={styles.alertBody}>
            This is a vishing (voice phishing) attempt. Real RBI/bank officials never ask for OTP or passwords over a call.
          </Text>
        </View>
      )}

      {isDone && (
        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetText}>Clear and record again</Text>
        </TouchableOpacity>
      )}

      {!isRecording && segments.length === 0 && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Record a suspicious call</Text>
          <Text style={styles.placeholderSub}>
            Speech is transcribed live on-device using Whisper. Supports Hindi, Marathi, Gujarati and English. No audio ever leaves your phone.
          </Text>
          <View style={styles.privacyBadge}>
            <Text style={styles.privacyText}>100% offline · on-device only</Text>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },

  voiceCard: {
    backgroundColor: colors.cardDeep,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  recordBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  recordBtnActive: { backgroundColor: colors.dangerBg },
  stopIcon: {
    width: 20, height: 20,
    backgroundColor: colors.danger,
    borderRadius: 4,
  },
  micWrap: { alignItems: 'center' },
  micBody: {
    width: 14, height: 20,
    backgroundColor: colors.accentLight,
    borderRadius: 7,
  },
  micStand: {
    width: 2, height: 8,
    backgroundColor: colors.accentLight,
    marginTop: 2,
  },
  recLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32 },
  waveBar: { width: 3, borderRadius: 2 },

  transcriptCard: {
    backgroundColor: colors.cardDeep,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptLabel: {
    color: colors.textFaint,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  liveText: { color: colors.dangerText, fontSize: 11, fontWeight: '500' },
  transcriptBody: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  normalWord: { color: colors.textSecondary },
  highlightWord: { color: colors.dangerText, backgroundColor: colors.dangerBg, fontWeight: '500' },

  alertBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    gap: 4,
  },
  alertTitle: { color: colors.dangerText, fontSize: 14, fontWeight: '500' },
  alertBody: { color: '#cc6666', fontSize: 12, lineHeight: 17 },

  resetBtn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetText: { color: colors.textMuted, fontSize: 13 },

  placeholder: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  placeholderTitle: {
    color: colors.textSecondary,
    fontSize: 15, fontWeight: '500', textAlign: 'center',
  },
  placeholderSub: {
    color: colors.textMuted,
    fontSize: 12, textAlign: 'center', lineHeight: 18,
  },
  privacyBadge: {
    marginTop: 8,
    backgroundColor: colors.safeBg,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  privacyText: { color: colors.safeText, fontSize: 11 },
});
