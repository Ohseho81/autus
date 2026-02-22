/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧭 AUTUS v2.0 Navigator - 베이조스 스타일 업그레이드
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 총 17개 화면:
 * - Auth (2): Login, PasswordReset
 * - Admin (6): Monitor, Dashboard, EntityList, EntityDetail, Schedule, Settings
 * - Staff (3): CoachHome, AttendanceAuto, VideoUpload
 * - Consumer (6): Status, History, SelfService, Payment, Reservation
 *
 * 앱 철학:
 * - 코치: 출석 + 영상만 (나머지 자동화)
 * - 관리자: 모니터링만 (상담/스케줄/수납)
 * - 오너: 앱 안씀 (전략만)
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius } from '../utils/theme';
import { useIndustryConfig } from '../context/IndustryContext';
import { L } from '../config/labelMap';
import { setUserContext, clearUserContext, addBreadcrumb } from '../lib/sentry';

// ═══════════════════════════════════════════════════════════════════════════════
// Screens
// ═══════════════════════════════════════════════════════════════════════════════

// Auth (2)
import LoginScreen from '../screens/auth/LoginScreen';
import PasswordResetScreen from '../screens/v2/PasswordResetScreen';

// Admin (6) - 모니터링 중심
import AdminMonitorScreen from '../screens/v2/AdminMonitorScreen';
import DashboardScreen from '../screens/v2/DashboardScreen';
import EntityListScreen from '../screens/v2/EntityListScreen';
import EntityDetailScreen from '../screens/v2/EntityDetailScreen';
import ScheduleScreen from '../screens/v2/ScheduleScreen';
import SettingsScreen from '../screens/v2/SettingsScreen';
import GratitudeScreen from '../screens/v2/GratitudeScreen';

// Staff (3) - 코치: 출석 + 영상만
import CoachHomeScreen from '../screens/v2/CoachHomeScreen';
import AttendanceAutoScreen from '../screens/v2/AttendanceAutoScreen';
import VideoUploadScreen from '../screens/v2/VideoUploadScreen';

// 온리쌤 v5
import OnlySsamScreen from '../screens/v5/OnlySsamScreen';

// 온리쌤 v5 (코치 메인 화면)

// Consumer (5)
import StatusScreen from '../screens/v2/StatusScreen';
import HistoryScreen from '../screens/v2/HistoryScreen';
import ParentSelfServiceScreen from '../screens/v2/ParentSelfServiceScreen';
import PaymentScreen from '../screens/v2/PaymentScreen';
import ReservationScreen from '../screens/v2/ReservationScreen';

// 승원봇
import SeungwonBot from '../components/SeungwonBot';

// 온보딩
import OnboardingNavigator from './OnboardingNavigator';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'staff' | 'consumer' | null;

export type AuthStackParamList = {
  Login: undefined;
  PasswordReset: undefined;
};

export type AdminTabParamList = {
  Monitor: undefined;    // 상담/스케줄/수납 모니터링 (메인)
  Dashboard: undefined;  // Outcome 대시보드
  Entities: undefined;   // 회원 관리
  Schedule: undefined;   // 스케줄 관리
  Settings: undefined;   // 설정
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  EntityDetail: { entityId?: string; mode: 'view' | 'create' | 'edit' };
  Gratitude: undefined;
};

export type StaffStackParamList = {
  CoachHome: undefined;      // 코치 홈 (2버튼)
  AttendanceAuto: undefined; // 출석체크
  VideoUpload: undefined;    // 영상업로드
};

export type ConsumerTabParamList = {
  SelfService: undefined;
  Reservation: undefined;
  Status: undefined;
  History: undefined;
};

export type ConsumerStackParamList = {
  ConsumerTabs: undefined;
  Payment: undefined;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Role Context
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
  logout: () => {},
});

export const useRole = () => useContext(RoleContext);

// ═══════════════════════════════════════════════════════════════════════════════
// Navigators
// ═══════════════════════════════════════════════════════════════════════════════

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const StaffStack = createNativeStackNavigator<StaffStackParamList>();
const ConsumerTab = createBottomTabNavigator<ConsumerTabParamList>();

const navigationRef = createNavigationContainerRef();

// 화면 이름 → 한글 매핑 (승원봇 AI 컨텍스트용)
const SCREEN_LABELS: Record<string, string> = {
  Monitor: '모니터',
  Dashboard: 'Outcome 대시보드',
  Entities: '회원 관리',
  EntityDetail: '회원 상세',
  Schedule: '일정',
  Settings: '설정',
  Gratitude: '감사 기록',
  CoachHome: '코치 홈',
  AttendanceAuto: '출석 체크',
  VideoUpload: '영상 업로드',
  SelfService: '학부모 홈',
  Reservation: '예약',
  Status: '현황',
  History: '기록',
  Payment: '결제',
};

function getCurrentRouteName(): string | undefined {
  if (!navigationRef.isReady()) return undefined;
  return navigationRef.getCurrentRoute()?.name;
}

// AUTUS Dark Theme
const AutusTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.safe.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text.primary,
    border: colors.border.primary,
    notification: colors.danger.primary,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Navigator (5 screens)
// ═══════════════════════════════════════════════════════════════════════════════

function AdminTabs() {
  const { config } = useIndustryConfig();

  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: config.color.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Monitor':
              iconName = focused ? 'eye' : 'eye-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Entities':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }

          return (
            <View style={[styles.tabIconContainer, focused && { backgroundColor: `${config.color.primary}20` }]}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <AdminTab.Screen
        name="Monitor"
        component={AdminMonitorScreen}
        options={{ tabBarLabel: '모니터' }}
      />
      <AdminTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Outcome' }}
      />
      <AdminTab.Screen
        name="Entities"
        component={EntityListScreen}
        options={{ tabBarLabel: L.entities(config) }}
      />
      <AdminTab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ tabBarLabel: '일정' }}
      />
      <AdminTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </AdminTab.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="AdminTabs" component={AdminTabs} />
      <AdminStack.Screen name="EntityDetail" component={EntityDetailScreen} />
      <AdminStack.Screen name="Gratitude" component={GratitudeScreen} />
    </AdminStack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Staff Navigator (3 screens) - 코치: 출석 + 영상만
// ═══════════════════════════════════════════════════════════════════════════════

function StaffNavigator() {
  return (
    <StaffStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'slide_from_right',
      }}
    >
      {/* 온리쌤 v5 — 코치 메인 화면 */}
      <StaffStack.Screen name="CoachHome" component={OnlySsamScreen} />
      <StaffStack.Screen name="AttendanceAuto" component={AttendanceAutoScreen} />
      <StaffStack.Screen name="VideoUpload" component={VideoUploadScreen} />
    </StaffStack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Consumer Navigator (5 screens) - 베이조스 스타일 셀프서비스
// ═══════════════════════════════════════════════════════════════════════════════

const ConsumerStack = createNativeStackNavigator<ConsumerStackParamList>();

function ConsumerTabs() {
  const { config } = useIndustryConfig();

  return (
    <ConsumerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: config.color.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'SelfService':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Reservation':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Status':
              iconName = focused ? 'pulse' : 'pulse-outline';
              break;
            case 'History':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
          }

          return (
            <View style={[styles.tabIconContainer, focused && { backgroundColor: `${config.color.primary}20` }]}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <ConsumerTab.Screen
        name="SelfService"
        component={ParentSelfServiceScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <ConsumerTab.Screen
        name="Reservation"
        component={ReservationScreen}
        options={{ tabBarLabel: '예약' }}
      />
      <ConsumerTab.Screen
        name="Status"
        component={StatusScreen}
        options={{ tabBarLabel: '현황' }}
      />
      <ConsumerTab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: '기록' }}
      />
    </ConsumerTab.Navigator>
  );
}

function ConsumerNavigator() {
  return (
    <ConsumerStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ConsumerStack.Screen name="ConsumerTabs" component={ConsumerTabs} />
      <ConsumerStack.Screen name="Payment" component={PaymentScreen} />
    </ConsumerStack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Navigator (2 screens)
// ═══════════════════════════════════════════════════════════════════════════════

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </AuthStack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Root Navigator
// ═══════════════════════════════════════════════════════════════════════════════

const ONBOARDING_KEY = '@onlyssam_onboarding';

export default function AppNavigatorV2() {
  const [role, setRole] = useState<UserRole>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('');

  // 온보딩 완료 여부 체크
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setIsOnboarded(value === 'true'))
      .catch(() => setIsOnboarded(false));
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOnboarded(true);
  };

  const logout = () => {
    clearUserContext();
    setRole(null);
  };

  const handleStateChange = useCallback(() => {
    const routeName = getCurrentRouteName();
    if (routeName) {
      const label = SCREEN_LABELS[routeName] || routeName;
      setCurrentScreen(label);
      addBreadcrumb(`Navigate: ${label}`, 'navigation', { routeName });
    }
  }, []);

  // 로딩 중
  if (isOnboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B2C" />
      </View>
    );
  }

  // 온보딩 미완료
  if (!isOnboarded) {
    return <OnboardingNavigator onComplete={handleOnboardingComplete} />;
  }

  // 온보딩 완료 → 기존 앱
  return (
    <RoleContext.Provider value={{ role, setRole, logout }}>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} theme={AutusTheme} onStateChange={handleStateChange}>
          {role === null && <AuthNavigator />}
          {role === 'admin' && <AdminNavigator />}
          {role === 'staff' && <StaffNavigator />}
          {role === 'consumer' && <ConsumerNavigator />}
        </NavigationContainer>
        {/* 승원봇 - 로그인 후 모든 화면에서 표시 */}
        {role !== null && <SeungwonBot userRole={role} currentScreen={currentScreen} />}
      </View>
    </RoleContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border.primary,
    borderTopWidth: 1,
    height: 80,
    paddingTop: spacing[1],
    paddingBottom: spacing[4],
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: -spacing[1],
  },
  tabIconContainer: {
    padding: spacing[1],
    borderRadius: borderRadius.lg,
  },
});
