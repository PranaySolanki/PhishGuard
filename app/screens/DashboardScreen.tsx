import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, getRiskColor, getRiskBg, getRiskText } from '../theme/colors';
import { AnalysisResult, computeStats } from '../data/analysisEngine';
import BarChart from '../components/BarChart';
import RiskMeter from '../components/RiskMeter';

type Props = { results: AnalysisResult[]; onSelect: (r: AnalysisResult) => void };

const timeAgo = (ts: number) => {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function DashboardScreen({ results, onSelect }: Props) {
  const stats = computeStats(results);
  const recent = [...results].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  const riskBars = recent.slice(0, 6).map((r, i) => ({
    label: r.fileName ? r.fileName.split('.')[0].slice(0, 6) : `#${i + 1}`,
    value: r.riskScore,
  }));

  const langMap: Record<string, number> = {};
  results.forEach(r => { langMap[r.language] = (langMap[r.language] || 0) + 1; });
  const langBars = Object.entries(langMap).map(([lang, count]) => ({
    label: lang.slice(0, 5),
    value: count,
    color: colors.accentLight,
  }));

  const typeMap: Record<string, number> = {};
  results.forEach(r => { typeMap[r.phishingType] = (typeMap[r.phishingType] || 0) + 1; });
  const typeBars = Object.entries(typeMap).map(([type, count]) => ({
    label: type.slice(0, 7),
    value: count,
    color: colors.warning,
  }));

  if (results.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No scans yet</Text>
        <Text style={styles.emptySub}>Upload audio files or paste text messages to see analysis results here.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <Text style={[styles.statNum, { color: colors.dangerText }]}>{stats.highRisk}</Text>
          <Text style={[styles.statLabel, { color: colors.dangerText }]}>Threats</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
          <Text style={[styles.statNum, { color: colors.safeText }]}>{stats.safe}</Text>
          <Text style={[styles.statLabel, { color: colors.safeText }]}>Safe</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
          <Text style={[styles.statNum, { color: colors.warningText }]}>{stats.suspicious}</Text>
          <Text style={[styles.statLabel, { color: colors.warningText }]}>Warnings</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Average risk score</Text>
            <RiskMeter score={stats.avgRisk} showLabel={false} />
          </View>
          <View style={styles.divider} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.cardLabel}>Top language</Text>
            <Text style={styles.bigText}>{stats.topLanguage}</Text>
            <Text style={styles.smallText}>{langMap[stats.topLanguage]} scans</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Recent scans</Text>

      {recent.map(r => (
        <TouchableOpacity key={r.id} style={styles.scanItem} onPress={() => onSelect(r)}>
          <View style={[styles.typeIcon, { backgroundColor: getRiskBg(r.riskScore) }]}>
            <Text style={{ color: getRiskColor(r.riskScore), fontSize: 13 }}>
              {r.inputType === 'audio' ? '🎙' : '💬'}
            </Text>
          </View>
          <View style={styles.scanText}>
            <Text style={styles.scanName} numberOfLines={1}>{r.fileName ?? 'Pasted text'}</Text>
            <Text style={styles.scanMeta}>{r.language} · {r.phishingType} · {timeAgo(r.timestamp)}</Text>
          </View>
          <View style={styles.scanRight}>
            <Text style={[styles.scanScore, { color: getRiskColor(r.riskScore) }]}>{r.riskScore}</Text>
            <View style={[styles.levelBadge, { backgroundColor: getRiskBg(r.riskScore) }]}>
              <Text style={[styles.levelText, { color: getRiskText(r.riskScore) }]}>{r.riskLevel}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, backgroundColor: colors.bg },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: '500', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '500' },
  statLabel: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  card: { backgroundColor: colors.cardDeep, borderRadius: 14, padding: 14 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  divider: { width: 0.5, height: 50, backgroundColor: colors.border },
  bigText: { color: colors.textPrimary, fontSize: 18, fontWeight: '500' },
  smallText: { color: colors.textMuted, fontSize: 11 },
  chartsRow: { flexDirection: 'row', gap: 10 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, marginBottom: 4 },
  scanItem: {
    backgroundColor: colors.cardDeep, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scanText: { flex: 1 },
  scanName: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  scanMeta: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  scanRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  scanScore: { fontSize: 18, fontWeight: '600' },
  levelBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  levelText: { fontSize: 10, fontWeight: '600' },
});
