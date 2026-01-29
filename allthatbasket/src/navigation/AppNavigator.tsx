/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧭 AppNavigator - KRATON 스타일 네비게이션
 * AUTUS 2.0 Mobile Navigation System
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius } from '../utils/theme';
import { DrawerContent } from '../components/navigation';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/home/HomeScreen';
import RiskScreen from '../screens/risk/RiskScreen';

// Student Screens
import StudentListScreen from '../screens/student/StudentListScreen';
import StudentDetailScreen from '../screens/student/StudentDetailScreen';
import StudentCreateScreen from '../screens/student/StudentCreateScreen';
import StudentEditScreen from '../screens/student/StudentEditScreen';

// Consultation Screens
import ConsultationCreateScreen from '../screens/consultation/ConsultationCreateScreen';
import ConsultationDetailScreen from '../screens/consultation/ConsultationDetailScreen';

// Reports Screen
import ReportsScreen from '../screens/reports/ReportsScreen';

// Settings Screens
import ProfileSettingsScreen from '../screens/settings/ProfileSettingsScreen';
import AcademySettingsScreen from '../screens/settings/AcademySettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import RiskSettingsScreen from '../screens/settings/RiskSettingsScreen';

// Feature Screens
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import ConsultationListScreen from '../screens/consultation/ConsultationListScreen';
import TimelineScreen from '../screens/timeline/TimelineScreen';
import ForecastScreen from '../screens/forecast/ForecastScreen';
import ActionsScreen from '../screens/actions/ActionsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Lesson Screens (통합 플로우)
import LessonRegistrationScreen from '../screens/lesson/LessonRegistrationScreen';
import SmartAttendanceScreen from '../screens/lesson/SmartAttendanceScreen';
import LessonChatScreen from '../screens/lesson/LessonChatScreen';
import LessonFeedbackScreen from '../screens/feedback/LessonFeedbackScreen';

// Type Definitions
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  DrawerNav: undefined;
  StudentDetail: { studentId: string };
  StudentCreate: undefined;
  StudentEdit: { studentId: string };
  ConsultationCreate: { studentId?: string };
  ConsultationDetail: { consultationId: string };
  RiskSettings: undefined;
  ProfileSettings: undefined;
  AcademySettings: undefined;
  NotificationSettings: undefined;
  Reports: undefined;
  // Lesson Flow (통합 플로우)
  LessonRegistration: undefined;
  SmartAttendance: undefined;
  LessonFeedback: { lessonId: string };
  LessonChat: { lessonId: string; studentId?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Students: undefined;
  Risk: undefined;
  Actions: undefined;
  More: undefined;
};

export type DrawerParamList = {
  MainTabs: undefined;
  SmartAttendance: undefined;
  Attendance: undefined;
  Payments: undefined;
  Risk: undefined;
  Consultations: undefined;
  Timeline: undefined;
  Forecast: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// KRATON Dark Theme
const KratonTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.safe.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger.primary,
  },
};

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.safe.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Students':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Risk':
              iconName = focused ? 'warning' : 'warning-outline';
              break;
            case 'Actions':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            case 'More':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
          }

          return (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="Students"
        component={StudentListScreen}
        options={{ tabBarLabel: '학생' }}
      />
      <Tab.Screen
        name="Risk"
        component={RiskScreen}
        options={{ tabBarLabel: '위험' }}
      />
      <Tab.Screen
        name="Actions"
        component={ActionsScreen}
        options={{ tabBarLabel: '액션' }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{ tabBarLabel: '더보기' }}
      />
    </Tab.Navigator>
  );
}

// Drawer Navigator
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: styles.drawer,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
      <Drawer.Screen name="SmartAttendance" component={SmartAttendanceScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="Payments" component={PaymentScreen} />
      <Drawer.Screen name="Risk" component={RiskScreen} />
      <Drawer.Screen name="Consultations" component={ConsultationListScreen} />
      <Drawer.Screen name="Timeline" component={TimelineScreen} />
      <Drawer.Screen name="Forecast" component={ForecastScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

// Auth Navigator
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
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main App Stack
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="DrawerNav" component={DrawerNavigator} />
      {/* Student Screens */}
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentCreate" component={StudentCreateScreen} />
      <Stack.Screen name="StudentEdit" component={StudentEditScreen} />
      {/* Consultation Screens */}
      <Stack.Screen name="ConsultationCreate" component={ConsultationCreateScreen} />
      <Stack.Screen name="ConsultationDetail" component={ConsultationDetailScreen} />
      {/* Reports Screen */}
      <Stack.Screen name="Reports" component={ReportsScreen} />
      {/* Settings Screens */}
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="AcademySettings" component={AcademySettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="RiskSettings" component={RiskSettingsScreen} />
      {/* Lesson Screens (통합 플로우) */}
      <Stack.Screen name="LessonRegistration" component={LessonRegistrationScreen} />
      <Stack.Screen name="LessonFeedback" component={LessonFeedbackScreen} />
      <Stack.Screen name="LessonChat" component={LessonChatScreen} />
    </Stack.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  // TODO: Add auth state management (e.g., using Context or Zustand)
  const isAuthenticated = true; // For now, always authenticated for testing

  return (
    <NavigationContainer theme={KratonTheme}>
      {isAuthenticated ? <AppStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
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
  tabIconContainerActive: {
    backgroundColor: colors.safe.bg,
  },
  drawer: {
    backgroundColor: colors.background,
    width: 280,
  },
});
