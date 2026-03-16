import React, { useState } from 'react';
import DashboardScreen from '../screens/DashboardScreen';
import { AnalysisResult, DEMO_RESULTS } from '../data/analysisEngine';
import { View, Text } from 'react-native';

export default function HistoryTab() {
  const [results, setResults] = useState<AnalysisResult[]>(DEMO_RESULTS);

  return (
    <View style={{ flex: 1 }}>
      <DashboardScreen results={results} onSelect={(r) => console.log('Selected', r.id)} />
    </View>
  );
}
