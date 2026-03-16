import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { getRiskColor, getRiskBg, getRiskText, colors } from '../theme/colors';

type Props = { score: number; confidence?: number; showLabel?: boolean; compact?: boolean };

export default function RiskMeter({ score, confidence, showLabel = true, compact = false }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: score / 100, duration: 900, useNativeDriver: false }).start();
  }, [score]);

  const riskColor = getRiskColor(score);
  const verdict = score >= 70 ? 'High Risk' : score >= 40 ? 'Suspicious' : 'Safe';

  return (
    <View style={compact ? styles.compact : styles.full}>
      {showLabel && !compact && (
        <View style={styles.header}>
          <Text style={styles.label}>Risk score</Text>
          <View style={[styles.badge, { backgroundColor: getRiskBg(score) }]}>
            <Text style={[styles.badgeText, { color: getRiskText(score) }]}>{verdict}</Text>
          </View>
        </View>
      )}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, {
          backgroundColor: riskColor,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
      </View>
      <View style={styles.row}>
        <Text style={[styles.num, compact && styles.numSmall]}>{score}</Text>
        <Text style={styles.denom}>/100</Text>
        {confidence !== undefined && !compact && (
          <Text style={styles.conf}>  ·  {confidence}% confidence</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { gap: 6 },
  compact: { gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '500' },
  track: { height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  num: { color: colors.textPrimary, fontSize: 22, fontWeight: '500' },
  numSmall: { fontSize: 16 },
  denom: { color: colors.textFaint, fontSize: 12 },
  conf: { color: colors.textMuted, fontSize: 11 },
});
