/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧭 OnboardingNavigator - 온보딩 플로우
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Splash → Welcome(3슬라이드+카카오) → AcademyConnect → ProfileSetup → AddStudents → Complete
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { colors } from '../utils/theme';

// Screens
import SplashScreen from '../screens/onboarding/SplashScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import AcademyConnectScreen from '../screens/onboarding/AcademyConnectScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import AddStudentsScreen from '../screens/onboarding/AddStudentsScreen';
import CompleteScreen from '../screens/onboarding/CompleteScreen';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type OnboardingStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  AcademyConnect: undefined;
  ProfileSetup: undefined;
  AddStudents: undefined;
  Complete: { onComplete?: () => void };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Navigator
// ═══════════════════════════════════════════════════════════════════════════════

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B2C',
    background: colors.background,
    card: colors.surface,
    text: colors.text.primary,
    border: colors.border.primary,
    notification: '#FF453A',
  },
};

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export default function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="AcademyConnect" component={AcademyConnectScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="AddStudents" component={AddStudentsScreen} />
        <Stack.Screen
          name="Complete"
          component={CompleteScreen}
          initialParams={{ onComplete }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
