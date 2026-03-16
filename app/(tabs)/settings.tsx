import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export default function SettingsTab() {
  const [autoScanSms, setAutoScanSms] = useState(true);
  const [callMonitor, setCallMonitor] = useState(true);
  const [urlScanner, setUrlScanner] = useState(true);
  
  const [langHindi, setLangHindi] = useState(true);
  const [langBengali, setLangBengali] = useState(true);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>DETECTION</Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Auto-scan SMS</Text>
            <Text style={styles.subtitle}>Scan incoming messages</Text>
          </View>
          <Switch value={autoScanSms} onValueChange={setAutoScanSms} trackColor={{ true: colors.safe }} />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Call monitoring</Text>
            <Text style={styles.subtitle}>Alert during live calls</Text>
          </View>
          <Switch value={callMonitor} onValueChange={setCallMonitor} trackColor={{ true: colors.safe }} />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>URL scanner</Text>
            <Text style={styles.subtitle}>Check links in messages</Text>
          </View>
          <Switch value={urlScanner} onValueChange={setUrlScanner} trackColor={{ true: colors.safe }} />
        </View>
      </View>

      <Text style={[styles.sectionHeader, { marginTop: 20 }]}>LANGUAGES</Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Hindi</Text>
            <Text style={styles.subtitle}>हिंदी</Text>
          </View>
          <Switch value={langHindi} onValueChange={setLangHindi} trackColor={{ true: colors.safe }} />
        </View>
        
        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Bengali</Text>
            <Text style={styles.subtitle}>বাংলা</Text>
          </View>
          <Switch value={langBengali} onValueChange={setLangBengali} trackColor={{ true: colors.safe }} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  sectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 12, letterSpacing: 0.8 },
  card: { backgroundColor: colors.cardDeep, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingVertical: 14 },
  textContainer: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  subtitle: { color: colors.textFaint, fontSize: 13, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 18 },
});
