import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HighlightSpan } from '../data/analysisEngine';
import { colors } from '../theme/colors';

type Props = { spans: HighlightSpan[] };

export default function HighlightedText({ spans }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <View>
      {tooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{tooltip}</Text>
        </View>
      )}
      <Text style={styles.base}>
        {spans.map((span, i) =>
          span.isPhishing ? (
            <Text
              key={i}
              style={styles.highlight}
              onPress={() => setTooltip(tooltip === span.reason ? null : (span.reason ?? null))}
            >
              {span.text}
            </Text>
          ) : (
            <Text key={i} style={styles.normal}>{span.text}</Text>
          )
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { fontSize: 13, lineHeight: 22 },
  normal: { color: colors.textSecondary },
  highlight: {
    color: '#f07070',
    backgroundColor: '#3a1a1a',
    borderRadius: 3,
    fontWeight: '500',
  },
  tooltip: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: colors.danger,
  },
  tooltipText: { color: colors.dangerText, fontSize: 11 },
});
