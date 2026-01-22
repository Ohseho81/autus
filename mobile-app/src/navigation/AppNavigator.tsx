/**
 * AUTUS Mobile App - Navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

// Screens
import SplashScreen from '../screens/onboarding/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import HomeScreen from '../screens/home/HomeScreen';
import StudentListScreen from '../screens/students/StudentListScreen';
import StudentDetailScreen from '../screens/students/StudentDetailScreen';
import StudentCreateScreen from '../screens/students/StudentCreateScreen';
import StudentEditScreen from '../screens/students/StudentEditScreen';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import RiskScreen from '../screens/risk/RiskScreen';
import ConsultationScreen from '../screens/consultation/ConsultationScreen';
import ConsultationCreateScreen from '../screens/consultation/ConsultationCreateScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import RiskSettingsScreen from '../screens/settings/RiskSettingsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import DrawerContent from '../components/navigation/DrawerContent';

// Types
import { colors } from '../utils/theme';

// Type Definitions
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Main: undefined;
  StudentDetail: { studentId: string };
  StudentCreate: undefined;
  StudentEdit: { studentId: string };
  ConsultationCreate: { studentId: string };
  RiskSettings: undefined;
  Profile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Students: undefined;
  Add: undefined;
  Consultation: undefined;
  Reports: undefined;
};

export type DrawerParamList = {
  MainTabs: undefined;
  Attendance: undefined;
  Payments: undefined;
  Risk: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Students') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Add') {
            iconName = 'add-circle';
          } else if (route.name === 'Consultation') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.gray[500],
        tabBarStyle: {
          height: 56,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerShown: false,
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
        name="Add" 
        component={StudentCreateScreen}
        options={{ 
          tabBarLabel: '등록',
          tabBarIconStyle: { marginTop: -4 },
        }}
      />
      <Tab.Screen 
        name="Consultation" 
        component={ConsultationScreen}
        options={{ tabBarLabel: '상담' }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ tabBarLabel: '리포트' }}
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
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="Payments" component={PaymentsScreen} />
      <Drawer.Screen name="Risk" component={RiskScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen 
          name="StudentDetail" 
          component={StudentDetailScreen}
          options={{
            headerShown: true,
            title: '학생 상세',
          }}
        />
        <Stack.Screen 
          name="StudentCreate" 
          component={StudentCreateScreen}
          options={{
            headerShown: true,
            title: '학생 등록',
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="StudentEdit" 
          component={StudentEditScreen}
          options={{
            headerShown: true,
            title: '정보 수정',
          }}
        />
        <Stack.Screen 
          name="ConsultationCreate" 
          component={ConsultationCreateScreen}
          options={{
            headerShown: true,
            title: '상담 기록',
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="RiskSettings" 
          component={RiskSettingsScreen}
          options={{
            headerShown: true,
            title: '위험 감지 설정',
          }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            headerShown: true,
            title: '프로필 설정',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
