import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, getRiskColor } from '../theme/colors';

type Bar = { label: string; value: number; max?: number; color?: string };
type Props = { bars: Bar[]; height?: number; title?: string };

export default function BarChart({ bars, height = 80, title }: Props) {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  return (
    <View style={styles.wrapper}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={[styles.chartArea, { height }]}>
        {bars.map((bar, i) => {
          const fillH = Math.max(4, (bar.value / maxVal) * (height - 20));
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.valLabel}>{bar.value}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  { height: fillH, backgroundColor: bar.color ?? getRiskColor(bar.value) }
                ]} />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>{bar.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  title: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  valLabel: { color: colors.textMuted, fontSize: 9 },
  barTrack: { width: '80%', alignItems: 'center', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 3, minHeight: 4 },
  barLabel: { color: colors.textFaint, fontSize: 9, textAlign: 'center' },
});
