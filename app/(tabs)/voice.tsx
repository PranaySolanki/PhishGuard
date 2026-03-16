import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import VoiceScreen from '../screens/VoiceScreen';
import AudioScreen from '../screens/AudioScreen';

export default function VoiceTab() {
  const [activeTab, setActiveTab] = useState<'live' | 'upload'>('live');

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'live' && styles.segmentActive]}
            onPress={() => setActiveTab('live')}
          >
            <Text style={[styles.segmentText, activeTab === 'live' && styles.segmentTextActive]}>
              Live Recording
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'upload' && styles.segmentActive]}
            onPress={() => setActiveTab('upload')}
          >
            <Text style={[styles.segmentText, activeTab === 'upload' && styles.segmentTextActive]}>
              Upload File
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'live' ? <VoiceScreen /> : <AudioScreen onResults={() => {}} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.cardDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
});
