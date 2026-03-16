import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, getRiskColor, getRiskBg, getRiskText } from '../theme/colors';
import { AnalysisResult } from '../data/analysisEngine';

type Props = { results: AnalysisResult[]; onSelect: (r: AnalysisResult) => void };

const timeAgo = (ts: number) => {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

export default function AlertsScreen({ results, onSelect }: Props) {
  const threats = [...results]
    .filter(r => r.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore);

  if (threats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>No threats detected</Text>
        <Text style={styles.emptySub}>All scanned messages and calls appear to be safe.</Text>
      </View>
    );
  }

  const highRisk = threats.filter(r => r.riskScore >= 70);
  const suspicious = threats.filter(r => r.riskScore >= 40 && r.riskScore < 70);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {highRisk.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.bannerIcon}>⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{highRisk.length} high-risk threat{highRisk.length !== 1 ? 's' : ''} detected</Text>
            <Text style={styles.bannerSub}>These messages or calls contain strong phishing indicators. Do not share OTP, passwords, or personal information.</Text>
          </View>
        </View>
      )}

      {highRisk.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>High risk</Text>
          {highRisk.map(r => <AlertCard key={r.id} result={r} onPress={() => onSelect(r)} />)}
        </>
      )}

      {suspicious.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Suspicious</Text>
          {suspicious.map(r => <AlertCard key={r.id} result={r} onPress={() => onSelect(r)} />)}
        </>
      )}
    </ScrollView>
  );
}

function AlertCard({ result, onPress }: { result: AnalysisResult; onPress: () => void }) {
  const riskColor = getRiskColor(result.riskScore);
  const riskBg = getRiskBg(result.riskScore);
  const riskText = getRiskText(result.riskScore);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftWidth: 3, borderLeftColor: riskColor, borderRadius: 12 }]}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardMeta}>
          <Text style={styles.cardType}>{result.phishingType}</Text>
          <Text style={styles.cardTime}>{timeAgo(result.timestamp)}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: riskBg }]}>
          <Text style={[styles.scoreNum, { color: riskText }]}>{result.riskScore}</Text>
          <Text style={[styles.scoreLabel, { color: riskText }]}>/ 100</Text>
        </View>
      </View>

      <Text style={styles.cardText} numberOfLines={2}>
        {result.originalText}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.tagsRow}>
          <View style={styles.tag}><Text style={styles.tagText}>{result.language}</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>{result.inputType === 'audio' ? 'Voice call' : 'SMS'}</Text></View>
          {result.suspiciousLinks.length > 0 && (
            <View style={[styles.tag, { backgroundColor: colors.dangerBg }]}>
              <Text style={[styles.tagText, { color: colors.dangerText }]}>Suspicious link</Text>
            </View>
          )}
        </View>
        <Text style={[styles.viewMore, { color: riskColor }]}>View details →</Text>
      </View>

      {result.redFlags.length > 0 && result.redFlags[0] !== 'No phishing patterns detected' && (
        <View style={styles.flagsRow}>
          {result.redFlags.slice(0, 3).map((f, i) => (
            <View key={i} style={styles.flagPill}>
              <Text style={styles.flagText}>{f}</Text>
            </View>
          ))}
          {result.redFlags.length > 3 && (
            <Text style={styles.moreFlags}>+{result.redFlags.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, backgroundColor: colors.bg },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: '500', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  alertBanner: {
    backgroundColor: colors.dangerBg, borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  bannerIcon: { fontSize: 18, marginTop: 1 },
  bannerTitle: { color: colors.dangerText, fontSize: 13, fontWeight: '500', marginBottom: 3 },
  bannerSub: { color: '#cc6666', fontSize: 11, lineHeight: 16 },
  sectionLabel: { color: colors.textFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  card: { backgroundColor: colors.card, padding: 14, gap: 10, borderRadius: 0 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { gap: 2 },
  cardType: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  cardTime: { color: colors.textFaint, fontSize: 10 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  scoreNum: { fontSize: 18, fontWeight: '500' },
  scoreLabel: { fontSize: 10 },
  cardText: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { color: colors.textFaint, fontSize: 9 },
  viewMore: { fontSize: 11, fontWeight: '500' },
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  flagPill: { backgroundColor: '#2a1a1a', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  flagText: { color: '#cc6666', fontSize: 9 },
  moreFlags: { color: colors.textFaint, fontSize: 9, alignSelf: 'center' },
});
