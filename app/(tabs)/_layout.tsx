import React from 'react';
import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView, StatusBar, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import AppHeader from '../../components/AppHeader';

const MaterialTopTabs = createMaterialTopTabNavigator().Navigator;
const Tabs = withLayoutContext(MaterialTopTabs);

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <AppHeader subtitle="AI-powered scam detector" />
      <View style={styles.tabContainer}>
        <Tabs
          screenOptions={{
            tabBarStyle: styles.tabBar,
            tabBarIndicatorStyle: styles.tabIndicator,
            tabBarItemStyle: styles.tabItem,
            tabBarLabelStyle: styles.tabLabel,
            tabBarActiveTintColor: '#ffffff',
            tabBarInactiveTintColor: colors.textMuted,
            tabBarPressColor: 'transparent',
            swipeEnabled: true,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ title: 'Scan' }}
          />
          <Tabs.Screen
            name="voice"
            options={{ title: 'Voice' }}
          />
          <Tabs.Screen
            name="history"
            options={{ title: 'History' }}
          />
          <Tabs.Screen
            name="settings"
            options={{ title: 'Settings' }}
          />
        </Tabs>
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
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBar: {
    backgroundColor: colors.cardDeep,
    elevation: 0,
    shadowOpacity: 0,
    marginHorizontal: 16,
    borderRadius: 24,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    justifyContent: 'center',
    padding: 2,
    alignItems: 'center',
  },
  tabIndicator: {
    backgroundColor: colors.accent,
    height: '100%',
    borderRadius: 22,
  },
  tabItem: {
    padding: 0,
    margin: 0,
    minHeight: 0,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'none',
    textAlign: 'center',
    margin: 0,
    padding: 0,
  },
});
