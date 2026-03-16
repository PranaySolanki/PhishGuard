import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { colors } from '../app/theme/colors';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function AppHeader({ title = 'PhishGuard', subtitle }: AppHeaderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🛡️</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.bg,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 79, 214, 0.2)', // Light accent for background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(42, 79, 214, 0.4)',
  },
  icon: {
    fontSize: 20,
  },
});
