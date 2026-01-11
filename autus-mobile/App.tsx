/**
 * AUTUS Mobile v2.1 (최적화됨)
 * Operating System of Reality
 * 
 * 개인/조직의 붕괴를 방지하는 물리 기반 모니터링 시스템
 * 
 * 최적화:
 * - React.memo로 컴포넌트 메모이제이션
 * - useMemo/useCallback으로 불필요한 재계산 방지
 * - FlatList로 긴 리스트 가상화
 * - Zustand subscribeWithSelector로 선택적 구독
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAutusStore, selectNodes } from './src/stores/autusStore';
import { theme } from './src/constants/theme';
import {
  HomeScreen,
  MissionScreen,
  TrinityScreen,
  SetupScreen,
  MeScreen,
} from './src/screens';

const Tab = createBottomTabNavigator();

// 네비게이션 테마 (메모이제이션)
const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.accent,
    background: theme.bg,
    card: theme.bg2,
    text: theme.text,
    border: theme.border,
    notification: theme.accent,
  },
};

// Tab Icon Component (메모이제이션)
const TabIcon = React.memo<{ icon: string; label: string; focused: boolean }>(
  ({ icon, label, focused }) => (
    <View style={styles.tabIcon}>
      <Text style={styles.tabIconText}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  )
);

// Header Component (메모이제이션)
const Header = React.memo(() => {
  const nodes = useAutusStore(selectNodes);
  const activeCount = useMemo(() => 
    Object.values(nodes).filter(n => n.active).length, 
    [nodes]
  );
  
  return (
    <SafeAreaView style={styles.header} edges={['top']}>
      <Text style={styles.headerTitle}>AUTUS v2.1</Text>
      <Text style={styles.headerSubtitle}>{activeCount}/36 노드</Text>
    </SafeAreaView>
  );
});

// Tab Screen Options Factory
const createTabOptions = (icon: string, label: string) => ({
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <TabIcon icon={icon} label={label} focused={focused} />
  ),
  tabBarLabel: () => null,
});

export default function App() {
  const loadFromStorage = useAutusStore(state => state.loadFromStorage);
  
  // 앱 시작 시 저장된 데이터 로드 (한 번만)
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);
  
  // 탭 옵션들 메모이제이션
  const homeOptions = useMemo(() => createTabOptions('🏠', 'Home'), []);
  const missionOptions = useMemo(() => createTabOptions('📋', 'Mission'), []);
  const trinityOptions = useMemo(() => createTabOptions('△', 'Trinity'), []);
  const setupOptions = useMemo(() => createTabOptions('⚙️', 'Setup'), []);
  const meOptions = useMemo(() => createTabOptions('👤', 'Me'), []);
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <Header />
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarActiveTintColor: theme.accent,
              tabBarInactiveTintColor: theme.text3,
              lazy: true, // 탭 지연 로딩
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} options={homeOptions} />
            <Tab.Screen name="Mission" component={MissionScreen} options={missionOptions} />
            <Tab.Screen name="Trinity" component={TrinityScreen} options={trinityOptions} />
            <Tab.Screen name="Setup" component={SetupScreen} options={setupOptions} />
            <Tab.Screen name="Me" component={MeScreen} options={meOptions} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.bg,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.accent,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.text3,
  },
  tabBar: {
    backgroundColor: theme.bg2,
    borderTopColor: theme.border,
    borderTopWidth: 1,
    height: 80,
    paddingTop: 10,
  },
  tabIcon: {
    alignItems: 'center',
  },
  tabIconText: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: theme.text3,
    marginTop: 4,
  },
  tabLabelFocused: {
    color: theme.accent,
  },
});
